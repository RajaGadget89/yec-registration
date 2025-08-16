import { getSupabaseServiceClient } from "../../lib/supabase-server";

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient();

    // Execute the SQL commands one by one
    const commands = [
      "DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;",
      "DROP FUNCTION IF EXISTS update_updated_at_column();",
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::timestamptz;
           RETURN NEW;
       END;
       $$ language 'plpgsql';`,
      `CREATE TRIGGER update_registrations_updated_at 
       BEFORE UPDATE ON registrations 
       FOR EACH ROW 
       EXECUTE FUNCTION update_updated_at_column();`,
    ];

    // Execute each command
    for (const command of commands) {
      const { error } = await supabase.rpc("exec_sql", { sql: command });
      if (error) {
        console.error("Error executing SQL command:", error);
        console.error("Command was:", command);
        return new Response(
          JSON.stringify({
            error: "Failed to execute SQL command",
            message: error.message,
            command: command,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Timezone trigger fixed successfully. All future updates will use Thailand timezone (GMT+7).",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in fix timezone endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fix timezone",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
