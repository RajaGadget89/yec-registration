"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, Info } from "lucide-react";

interface PriceDisplayCardProps {
  hotelChoice: string;
  roomType: string | null;
  isEarlyBird: boolean;
  breakdown: {
    basePrice: number;
    roomSurcharge: number;
    total: number;
  };
  currency: string;
}

export default function PriceDisplayCard({
  hotelChoice,
  roomType,
  isEarlyBird,
  breakdown,
  currency,
}: PriceDisplayCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Show the card when we have valid selections
  useEffect(() => {
    const shouldShow = Boolean(
      hotelChoice &&
        (hotelChoice === "no-accommodation" ||
          (hotelChoice === "in-quota" && roomType) ||
          hotelChoice === "out-of-quota"),
    );
    setIsVisible(shouldShow);
  }, [hotelChoice, roomType]);

  if (!isVisible) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const getPackageDescription = () => {
    if (hotelChoice === "no-accommodation") {
      return "ไม่ต้องการที่พัก";
    } else if (hotelChoice === "out-of-quota") {
      return "เลือกโรงแรมเอง";
    } else if (hotelChoice === "in-quota") {
      if (roomType === "single") {
        return "โรงแรมที่จัดไว้ให้ - พักเดี่ยว";
      } else if (roomType === "double") {
        return "โรงแรมที่จัดไว้ให้ - พักคู่";
      }
    }
    return "";
  };

  return (
    <div className="bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 border border-yec-primary/20 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-yec-primary/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-yec-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ราคาแพ็กเกจ
          </h3>
        </div>

        {isEarlyBird && (
          <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Early Bird
            </span>
          </div>
        )}
      </div>

      {/* Package Description */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {getPackageDescription()}
        </p>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            ราคาพื้นฐาน:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatPrice(breakdown.basePrice)}
          </span>
        </div>

        {breakdown.roomSurcharge > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              ค่าห้องเดี่ยว:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              +{formatPrice(breakdown.roomSurcharge)}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              รวมทั้งสิ้น:
            </span>
            <span className="text-xl font-bold text-yec-primary">
              {formatPrice(breakdown.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Early Bird Info */}
      {isEarlyBird && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-green-800 dark:text-green-200 font-medium">
                คุณได้รับราคา Early Bird!
              </p>
              <p className="text-green-700 dark:text-green-300">
                ราคานี้จะใช้ได้จนถึงวันที่กำหนด
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Accommodation Info */}
      {hotelChoice === "no-accommodation" && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                ไม่มีค่าใช้จ่ายสำหรับที่พัก
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                คุณจะต้องจัดหาที่พักเอง
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
