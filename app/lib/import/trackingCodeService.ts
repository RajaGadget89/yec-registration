export interface TrackingCodeInput {
  province: string;
  id: string;
}

export interface TrackingCode {
  id: string;
  code: string;
  success: boolean;
  error?: string;
}

export interface TrackingCodeResult {
  id: string;
  trackingCode: string;
  success: boolean;
  error?: string;
}

export interface BatchTrackingCodeResult {
  success: boolean;
  trackingCodes: TrackingCodeResult[];
  errors?: string[];
}

/**
 * Simple tracking code generator used by the import pipeline.
 * It formats codes as YEC-<PROV>-<NNNNN> where <PROV> is an uppercased short province token.
 */
export class TrackingCodeService {
  private supabase: any;

  constructor() {
    // Import Supabase client dynamically to avoid circular dependencies
    // Using dynamic import to avoid circular dependency
    this.initSupabase();
  }

  private async initSupabase() {
    const { getSupabaseServiceClient } = await import("../supabase-server");
    this.supabase = getSupabaseServiceClient();
  }

  async generateBatchTrackingCodes(
    inputs: TrackingCodeInput[],
  ): Promise<BatchTrackingCodeResult> {
    const trackingCodes: TrackingCodeResult[] = [];
    const errors: string[] = [];

    for (const input of inputs) {
      try {
        const provinceCode = this.getProvinceCode(input.province);
        const { data: genCode, error: genErr } = await this.supabase.rpc(
          "generate_tracking_code",
          { p_province_code: provinceCode },
        );

        if (genErr) {
          throw genErr;
        }

        trackingCodes.push({
          id: input.id,
          trackingCode: genCode as string,
          success: true,
        });
      } catch (err: any) {
        const message = err?.message || "Failed to generate tracking code";
        errors.push(message);
        trackingCodes.push({
          id: input.id,
          trackingCode: "",
          success: false,
          error: message,
        });
      }
    }

    return {
      success: errors.length === 0,
      trackingCodes,
      errors: errors.length ? errors : undefined,
    };
  }

  private getProvinceCode(province: string): string {
    // Map province names to province codes used by the database function
    const provinceCodeMap: Record<string, string> = {
      narathiwat: "NWT",
      rayong: "RYG",
      "mae-hong-son": "MHS",
      "nakhon-pathom": "NPT",
      bangkok: "BKK",
      tak: "TAK",
      leoi: "LEO",
      trang: "TRG",
      trat: "TRT",
      nan: "NAN",
      satun: "STN",
      phrae: "PRE",
      chumphon: "CPN",
      phayao: "PYO",
      "phang-nga": "PNA",
      yasothon: "YST",
      ranong: "RNG",
      lampang: "LPG",
      lamphun: "LPN",
      songkhla: "SKL",
      krabi: "KBI",
      "chai-nat": "CTI",
      "nakhon-phanom": "NPM",
      "bueng-kan": "BKN",
      phatthalung: "PTL",
      phichit: "PCT",
      phuket: "PKT",
      "lop-buri": "LBR",
      "sakon-nakhon": "SNK",
      "khon-kaen": "KKN",
      chaiyaphum: "CPM",
      "nakhon-nayok": "NYK",
      nonthaburi: "NBI",
      pattani: "PTN",
      ratchaburi: "RBR",
      saraburi: "SBR",
      "sa-kaeo": "SKW",
      sukhothai: "STI",
      "nong-khai": "NKI",
      chanthaburi: "CTI",
      "pathum-thani": "PTI",
      phitsanulok: "PLK",
      mukdahan: "MDH",
      "roi-et": "RET",
      "si-sa-ket": "SSK",
      surin: "SRN",
      "udon-thani": "UDN",
      "chiang-rai": "CRI",
      phetchaburi: "PBI",
      kanchanaburi: "KRI",
      kalasin: "KSN",
      "kamphaeng-phet": "KPT",
      "nakhon-sawan": "NSW",
      "buri-ram": "BRM",
      "maha-sarakham": "MSK",
      "samut-sakhon": "SSO",
      "sing-buri": "SBI",
      uttaradit: "UTI",
      "uthai-thani": "UTN",
      "chiang-mai": "CMI",
      phetchabun: "PBN",
      chachoengsao: "CCO",
      "nakhon-ratchasima": "NRS",
      "prachin-buri": "PRI",
      "suphan-buri": "SPB",
      "amnat-charoen": "ACR",
      "samut-prakan": "SPK",
      "samut-songkhram": "SSM",
      "nong-bua-lamphu": "NBP",
      "ubon-ratchathani": "URT",
      "surat-thani": "STI",
      "nakhon-si-thammarat": "NST",
      "prachuap-khiri-khan": "PKH",
      "phra-nakhon-si-ayutthaya": "AYA",
    };

    return provinceCodeMap[province] || "BKK";
  }
}
