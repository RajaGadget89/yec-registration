"use client";

import React from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, Clock, DollarSign, Info } from "lucide-react";

interface RequestUpdatePricingDisplayProps {
  priceCalculation: {
    price: number;
    currency: string;
    isEarlyBird: boolean;
    packageCode: string;
    breakdown: {
      basePrice: number;
      roomSurcharge: number;
      total: number;
    };
    originalPricing?: {
      originalPrice: number;
      originalCurrency: string;
      originalIsEarlyBird: boolean;
      originalPackageCode: string;
      originalBreakdown: any;
      originalRegistrationTime: string;
    };
    updateType?: string;
  } | null;
  isLoading?: boolean;
}

export default function RequestUpdatePricingDisplay({
  priceCalculation,
  isLoading = false,
}: RequestUpdatePricingDisplayProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            ราคาแพ็กเกจ (Package Price)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!priceCalculation) {
    return null;
  }

  const formatPrice = (price: number, currency: string = "THB") => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPackageDisplayName = (packageCode: string) => {
    switch (packageCode) {
      case "no-accommodation":
        return "ไม่ต้องการที่พัก";
      case "out-of-quota":
        return "โรงแรมที่จัดไว้ให้ - เกินโควต้า";
      case "in-quota-single":
        return "โรงแรมที่จัดไว้ให้ - พักเดี่ยว";
      case "in-quota-double":
        return "โรงแรมที่จัดไว้ให้ - พักคู่";
      default:
        return packageCode;
    }
  };

  const isPriceChanged =
    priceCalculation.originalPricing &&
    priceCalculation.originalPricing.originalPrice !== priceCalculation.price;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          ราคาแพ็กเกจ (Package Price)
          {priceCalculation.isEarlyBird && (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 border-green-300"
            >
              <Clock className="h-3 w-3 mr-1" />
              Early Bird
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Package Selection */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            {getPackageDisplayName(priceCalculation.packageCode)}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>ราคาพื้นฐาน:</span>
              <span>{formatPrice(priceCalculation.breakdown.basePrice)}</span>
            </div>
            {priceCalculation.breakdown.roomSurcharge > 0 && (
              <div className="flex justify-between">
                <span>ค่าห้องเดี่ยว:</span>
                <span>
                  +{formatPrice(priceCalculation.breakdown.roomSurcharge)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>รวมทั้งสิ้น:</span>
              <span className="text-blue-600">
                {formatPrice(priceCalculation.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Early Bird Information */}
        {priceCalculation.isEarlyBird && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>คุณได้รับราคา Early Bird!</strong>
              <br />
              ราคานี้จะใช้ได้จนถึงวันที่กำหนด
            </AlertDescription>
          </Alert>
        )}

        {/* Original Pricing Information (if available) */}
        {priceCalculation.originalPricing && (
          <div className="space-y-3">
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                ข้อมูลการสมัครเดิม (Original Registration)
              </h4>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>แพ็กเกจเดิม:</span>
                  <span>
                    {getPackageDisplayName(
                      priceCalculation.originalPricing.originalPackageCode,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ราคาเดิม:</span>
                  <span>
                    {formatPrice(
                      priceCalculation.originalPricing.originalPrice,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>สถานะ Early Bird:</span>
                  <span>
                    {priceCalculation.originalPricing.originalIsEarlyBird ? (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 text-xs"
                      >
                        Early Bird
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-800 text-xs"
                      >
                        Normal Price
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>วันที่สมัคร:</span>
                  <span>
                    {formatDate(
                      priceCalculation.originalPricing.originalRegistrationTime,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Change Alert */}
            {isPriceChanged && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>ราคาเปลี่ยนแปลง:</strong>
                  <br />
                  ราคาเดิม:{" "}
                  {formatPrice(priceCalculation.originalPricing.originalPrice)}
                  <br />
                  ราคาใหม่: {formatPrice(priceCalculation.price)}
                  <br />
                  <span className="text-sm">
                    {priceCalculation.price >
                    priceCalculation.originalPricing.originalPrice
                      ? "ราคาเพิ่มขึ้น"
                      : "ราคาลดลง"}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Update Type Indicator */}
        {priceCalculation.updateType === "request_update" && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            ราคานี้คำนวณสำหรับการอัปเดตข้อมูล (Request Update)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
