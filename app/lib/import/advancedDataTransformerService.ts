// // import { Registration } from '../types/registration';

export interface TransformationRule {
  sourceField: string;
  targetField: string;
  transformation: (value: any) => any;
  condition?: (row: any) => boolean;
}

export interface ApprovalStatusConfig {
  tccApproved: boolean;
  profileApproved: boolean;
  paymentApproved: boolean;
}

export class AdvancedDataTransformerService {
  private transformationRules: TransformationRule[] = [];
  private approvalStatusConfig: ApprovalStatusConfig = {
    tccApproved: true,
    profileApproved: true,
    paymentApproved: true,
  };
  private businessTypeMap: Record<string, string> = {
    ค้าปลีก: "retail",
    "ค้าปลีก-ค้าส่ง": "retail",
    "ค้าปลีก-ค้าส่ง รีสอร์ท": "retail",
    อาหารและเครื่องดื่ม: "food-beverage",
    สุขภาพและการแพทย์: "healthcare",
    การเงินและการธนาคาร: "finance-banking",
    การศึกษา: "education",
    การผลิต: "manufacturing",
    การก่อสร้าง: "construction",
    อสังหาริมทรัพย์: "real-estate",
    การท่องเที่ยว: "tourism",
    แฟชั่นและเสื้อผ้า: "fashion",
    ยานยนต์: "automotive",
    พลังงาน: "energy",
    โลจิสติกส์: "logistics",
    สื่อและบันเทิง: "media-entertainment",
    ที่ปรึกษา: "consulting",
    กฎหมาย: "legal",
    การตลาด: "marketing",
    เกษตรกรรม: "agriculture",
    โรงแรม: "hotel",
    บริการ: "services",
    ปั๊มน้ำมัน: "oil-gas-retail",
    นำเข้าไม้แปรรูป: "import",
    "Organize & Event": "event",
    "การประกันชีวิต สุขภาพ และ ลงทุน": "insurance",
    "EV charger & Solar cell": "energy",
    กระดาษสำหรับบรรจุภัณฑ์อาหาร: "packaging",
    "Printing and Packaging": "packaging",
    Packaging: "packaging",
  };

  constructor() {
    this.initializeTransformationRules();
  }

  private initializeTransformationRules(): void {
    // Gender to Title transformation
    this.transformationRules.push({
      sourceField: "เพศ",
      targetField: "title",
      transformation: (value: string) => {
        const genderMap: Record<string, string> = {
          ชาย: "นาย",
          หญิง: "นางสาว",
        };
        return genderMap[value] || value;
      },
    });

    // Timestamp to created_at transformation
    this.transformationRules.push({
      sourceField: "Timestamp",
      targetField: "created_at",
      transformation: (value: string) => {
        if (!value) return new Date().toISOString();
        try {
          // Handle various timestamp formats
          const date = new Date(value);
          return isNaN(date.getTime())
            ? new Date().toISOString()
            : date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      },
    });

    // Time column to created_at transformation
    this.transformationRules.push({
      sourceField: "time",
      targetField: "created_at",
      transformation: (value: string) => {
        if (!value) return new Date().toISOString();
        try {
          const date = new Date(value);
          return isNaN(date.getTime())
            ? new Date().toISOString()
            : date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      },
    });

    // Approval status transformations
    this.transformationRules.push({
      sourceField: "Check TCC",
      targetField: "tcc_review_status",
      transformation: (value: string) => {
        return this.transformApprovalStatus(value);
      },
    });

    this.transformationRules.push({
      sourceField: "Check Profile Pic",
      targetField: "profile_review_status",
      transformation: (value: string) => {
        return this.transformApprovalStatus(value);
      },
    });

    this.transformationRules.push({
      sourceField: "Check Slip",
      targetField: "payment_review_status",
      transformation: (value: string) => {
        return this.transformApprovalStatus(value);
      },
    });
  }

  private transformApprovalStatus(value: string): string {
    // Since all imported users are pre-approved, always return 'approved'
    return "approved";
  }

  /**
   * Merge roommate columns with TRIM fallback
   */
  mergeRoommate(row: Record<string, any>): string | null {
    const trim = (row["ผู้พักร่วม (TRIM)"] || "").toString().trim();
    if (trim) return trim;
    const first = (row["ชื่อ ผู้พักร่วม"] || "").toString().trim();
    const last = (row["นามสกุล ผู้พักร่วม"] || "").toString().trim();
    const merged = [first, last].filter(Boolean).join(" ").trim();
    return merged || null;
  }

  /**
   * Map travel type phrases to enum
   */
  mapTravelType(raw: string | undefined): string | null {
    if (!raw) return null;
    const v = raw.toString().toLowerCase();
    if (v.includes("รถตู้") || v.includes("ส่วนกลาง")) return "van";
    if (v.includes("ส่วนตัว") || v.includes("ไปเอง") || v.includes("ตัวเอง"))
      return "private-car";
    return null;
  }

  /**
   * Parse ticket/hotel phrase for choice/room/price
   */
  parsePackageInfo(ticketText?: string): {
    hotel_choice?: string;
    room_type?: string | null;
    price_applied?: number | null;
    selected_package_code?: string | null;
  } {
    if (!ticketText)
      return {
        room_type: null,
        price_applied: null,
        selected_package_code: null,
      };
    const t = ticketText.replace(/\s+/g, " ");
    const contains = (s: string) => t.includes(s);
    if (contains("2,699") || contains("2699")) {
      return {
        hotel_choice: "in-quota",
        room_type: "single",
        price_applied: 2699,
        selected_package_code: "in-quota-single",
      };
    }
    if (
      (contains("1,999") || contains("1999")) &&
      (contains("พักคู่") || contains("คู่"))
    ) {
      return {
        hotel_choice: "in-quota",
        room_type: "double",
        price_applied: 1999,
        selected_package_code: "in-quota-double",
      };
    }
    if (contains("1,199") || contains("1199")) {
      return {
        hotel_choice: "in-quota",
        room_type: null,
        price_applied: 1199,
        selected_package_code: "in-quota-none",
      };
    }
    return {
      room_type: null,
      price_applied: null,
      selected_package_code: null,
    };
  }

  /**
   * Decide external hotel
   */
  decideHotel(rawHotel?: string): {
    hotel_choice?: string;
    external_hotel_name?: string | null;
  } {
    if (!rawHotel) return {};
    const val = rawHotel.toString().trim();
    if (!val) return {};
    const ignoreSet = [
      "ยังไม่ทราบ",
      "ไม่พัก",
      "ไม่นอน",
      "none",
      "บ้านเพื่อน",
      "ยกเลิก",
      "ไม่เอาที่พัก",
    ];
    if (ignoreSet.some((x) => val.includes(x))) return {};
    // Treat as external
    return { hotel_choice: "out-of-quota", external_hotel_name: val };
  }

  /**
   * Transform a single row of data according to all transformation rules
   */
  transformRow(row: Record<string, any>): Record<string, any> {
    const transformedRow: Record<string, any> = { ...row };

    // Apply all transformation rules
    this.transformationRules.forEach((rule) => {
      if (row[rule.sourceField] !== undefined) {
        const shouldTransform = !rule.condition || rule.condition(row);
        if (shouldTransform) {
          transformedRow[rule.targetField] = rule.transformation(
            row[rule.sourceField],
          );
        }
      }
    });

    // Roommate binding (TRIM preferred)
    const roommate = this.mergeRoommate(row);
    if (roommate) {
      transformedRow.roommate_info = roommate;
    }

    // Handle roommate constraints for double rooms
    if (transformedRow.room_type === "double") {
      // If no roommate info, provide default text for admin team
      if (!transformedRow.roommate_info) {
        transformedRow.roommate_info = "To be arranged by admin team";
      }
      // Always set roommate phone for double rooms
      transformedRow.roommate_phone = "0999999999";
    }

    // Travel type mapping
    const travel = this.mapTravelType(
      row["ประเภทการเดินทาง "] || row["ประเภทการเดินทาง"],
    );
    if (travel) transformedRow.travel_type = travel;

    // Ticket parsing (price/room/hotel_choice)
    const pkg = this.parsePackageInfo(row["ต้องการซื้อบัตรแบบไหน"]);
    if (pkg.hotel_choice) transformedRow.hotel_choice = pkg.hotel_choice;
    if (pkg.room_type !== undefined) transformedRow.room_type = pkg.room_type;
    if (pkg.price_applied !== null)
      transformedRow.price_applied = pkg.price_applied;
    if (pkg.selected_package_code)
      transformedRow.selected_package_code = pkg.selected_package_code;

    // External hotel detection from free text column
    const hotel = this.decideHotel(row["โรงแรมที่พัก"]);
    if (hotel.hotel_choice && !transformedRow.hotel_choice)
      transformedRow.hotel_choice = hotel.hotel_choice;
    if (hotel.external_hotel_name)
      transformedRow.external_hotel_name = hotel.external_hotel_name;

    // Business type mapping / fallback
    const bt = this.mapBusinessType(row["ประเภทธุรกิจ"]);
    if (bt.type) transformedRow.business_type = bt.type;
    if (!bt.mapped && bt.other) transformedRow.business_type_other = bt.other;

    // Set system-wide approval status
    transformedRow.status = "approved";
    transformedRow.tcc_review_status = "approved";
    transformedRow.profile_review_status = "approved";
    transformedRow.payment_review_status = "approved";
    // Use "passed" to match traditional form registrations
    transformedRow.review_checklist = JSON.stringify({
      tcc: { status: "passed" },
      payment: { status: "passed" },
      profile: { status: "passed" },
    });

    // Defaults
    transformedRow.currency = "THB";
    transformedRow.is_early_bird = true as any;

    // Set roommate phone default only if not already set for double rooms
    if (transformedRow.room_type !== "double") {
      transformedRow.roommate_phone = "N/A";
    }

    return transformedRow;
  }

  /**
   * Transform an array of rows
   */
  transformRows(rows: Record<string, any>[]): Record<string, any>[] {
    return rows.map((row) => this.transformRow(row));
  }

  /**
   * Get transformation preview for a single row
   */
  getTransformationPreview(row: Record<string, any>): {
    original: Record<string, any>;
    transformed: Record<string, any>;
    changes: Array<{
      field: string;
      originalValue: any;
      transformedValue: any;
      transformation: string;
    }>;
  } {
    const original = { ...row };
    const transformed = this.transformRow(row);

    const changes: Array<{
      field: string;
      originalValue: any;
      transformedValue: any;
      transformation: string;
    }> = [];

    // Identify changes
    Object.keys(transformed).forEach((key) => {
      if (original[key] !== transformed[key]) {
        changes.push({
          field: key,
          originalValue: original[key],
          transformedValue: transformed[key],
          transformation: this.getTransformationDescription(
            key,
            original[key],
            transformed[key],
          ),
        });
      }
    });

    return {
      original,
      transformed,
      changes,
    };
  }

  private getTransformationDescription(
    field: string,
    original: any,
    transformed: any,
  ): string {
    if (field === "title" && original === "ชาย") return "Gender: ชาย → นาย";
    if (field === "title" && original === "หญิง")
      return "Gender: หญิง → นางสาว";
    if (field === "created_at") return "Timestamp conversion";
    if (field.includes("_review_status"))
      return "Approval status: TRUE → approved";
    if (field === "status") return "System status: Set to approved";
    if (field === "review_checklist")
      return "Review checklist: Set to approved";
    return `Field transformation: ${original} → ${transformed}`;
  }

  /**
   * Map business type from Thai option to system slug.
   */
  mapBusinessType(raw: string | undefined): {
    mapped: boolean;
    type: string;
    other?: string;
  } {
    if (!raw) return { mapped: false, type: "other" };
    const key = raw.toString().trim();
    const mapped = this.businessTypeMap[key];
    if (mapped) return { mapped: true, type: mapped };
    return { mapped: false, type: "other", other: key };
  }

  /**
   * Validate transformation rules
   */
  validateTransformationRules(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate target fields
    const targetFields = this.transformationRules.map(
      (rule) => rule.targetField,
    );
    const duplicateFields = targetFields.filter(
      (field, index) => targetFields.indexOf(field) !== index,
    );

    if (duplicateFields.length > 0) {
      errors.push(`Duplicate target fields: ${duplicateFields.join(", ")}`);
    }

    // Check for circular transformations
    this.transformationRules.forEach((rule) => {
      if (rule.sourceField === rule.targetField) {
        warnings.push(`Circular transformation for field: ${rule.sourceField}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Add custom transformation rule
   */
  addTransformationRule(rule: TransformationRule): void {
    this.transformationRules.push(rule);
  }

  /**
   * Remove transformation rule
   */
  removeTransformationRule(sourceField: string, targetField: string): void {
    this.transformationRules = this.transformationRules.filter(
      (rule) =>
        !(rule.sourceField === sourceField && rule.targetField === targetField),
    );
  }

  /**
   * Get all transformation rules
   */
  getTransformationRules(): TransformationRule[] {
    return [...this.transformationRules];
  }

  /**
   * Set approval status configuration
   */
  setApprovalStatusConfig(config: ApprovalStatusConfig): void {
    this.approvalStatusConfig = config;
  }
}
