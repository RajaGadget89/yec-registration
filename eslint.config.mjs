import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "e2e/",
      "playwright*.ts",
      "scripts/",
      "**/*.spec.*",
      "**/*.test.*",
      "tests/",
      "backups/",
      "artifacts/",
      "tmp/",
      ".github/",
      "coverage/",
      ".next/",
      "node_modules/"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
   {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // 👈 ปิด rule นี้ชั่วคราว
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    }
  },
  {
    files: ["**/emails/templates/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off" // Allow <img> tags in email templates
    }
  },
  {
    files: ["app/lib/import/**/*.ts", "app/lib/emails/**/*.tsx", "app/api/admin/import/**/*.ts", "app/components/import/**/*.tsx", "app/admin/import/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_|value|index|config|sessionId|adminUserId|errors|warnings|jsonData|originalData|brandTokens|record|trackingCode|Papa|configKey|data|batches|csvData|current|csvColumns|mappedData|userId|batchSize",
          "varsIgnorePattern": "^_|value|index|config|sessionId|adminUserId|errors|warnings|jsonData|originalData|brandTokens|record|trackingCode|Papa|configKey|data|batches|csvData|current|csvColumns|FileData|mappedData|userId|batchSize",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

export default eslintConfig;
