import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { ExcelParserService } from "@/lib/import/excelParserService";

export async function POST(request: NextRequest) {
  try {
    // Validate super admin access
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Bad Request", message: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type (CSV and Excel files)
    const allowedTypes = [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const allowedExtensions = [".csv", ".xls", ".xlsx"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Only CSV and Excel files (.csv, .xls, .xlsx) are allowed",
        },
        { status: 400 },
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Bad Request", message: "File size exceeds 50MB limit" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Create import session
    console.log("Creating import session for user:", adminValidation.user?.id);
    console.log("File name:", file.name);

    const { data: importSession, error: sessionError } = await supabase
      .from("import_sessions")
      .insert({
        admin_user_id: adminValidation.user?.id,
        csv_filename: file.name,
        total_records: 0, // Will be updated after parsing
        status: "processing",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating import session:", sessionError);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to create import session",
        },
        { status: 500 },
      );
    }

    console.log("Import session created successfully:", importSession.id);

    // Parse file content (CSV or Excel)
    const parser = new ExcelParserService();
    const parseResult = await parser.parseFile(file);

    console.log("Parse result success:", parseResult.success);
    console.log("Parse result data:", parseResult.data);
    console.log("Parse result error:", parseResult.error);

    if (!parseResult.success) {
      console.error("Parse failed:", parseResult.error);
      return NextResponse.json(
        { error: "Bad Request", message: parseResult.error },
        { status: 400 },
      );
    }

    const recordCount =
      parseResult.data?.reduce((sum, sheet) => sum + sheet.rowCount, 0) || 0;
    console.log("Record count calculated:", recordCount);

    // Update session with record count and parsed data
    const { data: currentSession } = await supabase
      .from("import_sessions")
      .select("metadata")
      .eq("id", importSession.id)
      .single();

    console.log(
      "Current session metadata before update:",
      currentSession?.metadata,
    );
    console.log("Parse result data:", parseResult.data);
    console.log("Record count:", recordCount);

    // Ensure metadata is an object
    const existingMetadata = currentSession?.metadata || {};

    // Create the new metadata object
    const newMetadata = {
      ...existingMetadata,
      parsed_data: parseResult.data,
      file_type: file.type,
      file_size: file.size,
    };

    console.log("New metadata to store:", JSON.stringify(newMetadata, null, 2));

    const updateResult = await supabase
      .from("import_sessions")
      .update({
        total_records: recordCount,
        metadata: newMetadata,
      })
      .eq("id", importSession.id);

    console.log("Update result:", updateResult);
    console.log("Update result error:", updateResult.error);
    console.log("Update result data:", updateResult.data);

    if (updateResult.error) {
      console.error("Error updating session metadata:", updateResult.error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to update session metadata",
        },
        { status: 500 },
      );
    }

    console.log("Metadata update successful");

    // Verify the update was successful
    const { data: updatedSession, error: fetchError } = await supabase
      .from("import_sessions")
      .select("metadata, total_records")
      .eq("id", importSession.id)
      .single();

    if (fetchError) {
      console.error("Error fetching updated session:", fetchError);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to verify session update",
        },
        { status: 500 },
      );
    }

    console.log("Updated session metadata:", updatedSession?.metadata);
    console.log("Updated total_records:", updatedSession?.total_records);
    console.log(
      "Parsed data in metadata:",
      updatedSession?.metadata?.parsed_data,
    );

    // Verify that parsed_data was actually stored
    if (!updatedSession?.metadata?.parsed_data) {
      console.error("CRITICAL: parsed_data was not stored in metadata!");
      console.error(
        "Available keys:",
        Object.keys(updatedSession?.metadata || {}),
      );
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to store parsed data in session metadata",
        },
        { status: 500 },
      );
    }

    console.log("SUCCESS: parsed_data stored successfully");

    // Log audit event
    await supabase.from("import_audit_logs").insert({
      import_session_id: importSession.id,
      action: "file_uploaded",
      details: {
        filename: file.name,
        file_size: file.size,
        record_count: recordCount,
      },
      admin_user_id: adminValidation.user?.id,
    });

    return NextResponse.json({
      success: true,
      sessionId: importSession.id,
      filename: file.name,
      recordCount: recordCount,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error in file upload:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "File upload failed" },
      { status: 500 },
    );
  }
}
