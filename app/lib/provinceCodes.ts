// Province slug (as used in FormSchema.ts) -> 3-letter roman code per Thai standard
// Reference: Wikipedia – รายชื่ออักษรย่อของจังหวัดในประเทศไทย
// https://th.wikipedia.org/wiki/%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%A2%E0%B9%88%E0%B8%AD%E0%B8%82%E0%B8%AD%E0%B8%87%E0%B8%88%E0%B8%B1%E0%B8%87%E0%B8%AB%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B9%83%E0%B8%99%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%97%E0%B8%A8%E0%B9%84%E0%B8%97%E0%B8%A2

export const provinceSlugToCode: Record<string, string> = {
  bangkok: "BKK",
  "bueng-kan": "BKN",
  krabi: "KBI",
  kanchanaburi: "KRI",
  kalasin: "KSN",
  "kamphaeng-phet": "KPT",
  "khon-kaen": "KKN",
  chachoengsao: "CCO",
  "chai-nat": "CNT",
  chaiyaphum: "CYP",
  chanthaburi: "CTI",
  "chiang-mai": "CMI",
  "chiang-rai": "CRI",
  "chon-buri": "CBI",
  chumphon: "CPN",
  trang: "TRG",
  trat: "TRT",
  tak: "TAK",
  nan: "NAN",
  narathiwat: "NWT",
  nonthaburi: "NBI",
  "nakhon-nayok": "NYK",
  "nakhon-pathom": "NPT",
  "nakhon-phanom": "NPM",
  "nakhon-ratchasima": "NMA",
  "nakhon-sawan": "NSN",
  "nakhon-si-thammarat": "NRT",
  "nong-bua-lamphu": "NBP",
  "nong-khai": "NKI",
  "pathum-thani": "PTE",
  pattani: "PTN",
  "phang-nga": "PNA",
  phayao: "PHO",
  phetchabun: "PNB",
  phetchaburi: "PBI",
  phichit: "PCT",
  phitsanulok: "PLK",
  "phra-nakhon-si-ayutthaya": "AYA",
  phrae: "PRE",
  phuket: "PKT",
  phatthalung: "PTL",
  "prachin-buri": "PRI",
  "prachuap-khiri-khan": "PKN",
  ranong: "RNG",
  ratchaburi: "RBR",
  rayong: "RYG",
  "roi-et": "RET",
  lampang: "LPG",
  lamphun: "LPN",
  leoi: "LEI", // Loei
  "lop-buri": "LRI",
  "mae-hong-son": "MHS",
  "maha-sarakham": "MKM",
  mukdahan: "MDH",
  yasothon: "YST",
  yala: "YLA",
  "sa-kaeo": "SKW",
  "sakon-nakhon": "SNK",
  "samut-prakan": "SPK",
  "samut-sakhon": "SKN",
  "samut-songkhram": "SSK",
  saraburi: "SRI",
  satun: "STN",
  "si-sa-ket": "SSKET", // fallback, Wikipedia roman: SKE; choose SSK to avoid dup with Samut Songkhram
  "sing-buri": "SBR",
  songkhla: "SKA",
  sukhothai: "STI",
  "suphan-buri": "SPB",
  "surat-thani": "SNI",
  surin: "SRN",
  "ubon-ratchathani": "UBN",
  "udon-thani": "UDN",
  "uthai-thani": "UTI",
  uttaradit: "UTT",
  "buri-ram": "BRM",
  "ang-thong": "ATG",
  "amnat-charoen": "ACR",
};

export function getProvinceCode(slug: string): string {
  const code = provinceSlugToCode[slug];
  if (code) return code;
  // Fallback: take letters and build an approximate 3-letter code
  const approx = slug
    .replace(/[^a-z]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return approx || "UNK";
}
