"use client";

import { DollarSign, Clock } from "lucide-react";
import { Registration } from "../../types/database";

interface PackageInfoCardProps {
  registration: Registration;
}

export default function PackageInfoCard({
  registration,
}: PackageInfoCardProps) {
  // Helper function to get accommodation display text
  const getAccommodationText = (
    hotelChoice: string,
    roomType: string | null,
    externalHotelName?: string | null,
  ) => {
    if (hotelChoice === "no-accommodation") {
      return "ไม่ต้องการที่พัก";
    }
    if (hotelChoice === "out-of-quota") {
      return externalHotelName && externalHotelName.trim() !== ""
        ? `เลือกโรงแรมเอง - ${externalHotelName}`
        : "เลือกโรงแรมเอง";
    }
    if (hotelChoice === "in-quota") {
      if (roomType === "single") return "โรงแรมที่จัดไว้ให้ - พักเดี่ยว";
      if (roomType === "double") return "โรงแรมที่จัดไว้ให้ - พักคู่";
      if (roomType === "suite") return "โรงแรมที่จัดไว้ให้ - พักสวีท";
      return "โรงแรมที่จัดไว้ให้";
    }
    return "ไม่ระบุ";
  };

  // Get pricing information
  const priceBreakdown = registration.price_breakdown;
  const isEarlyBird = registration.is_early_bird;
  const totalPrice = priceBreakdown?.total || registration.price_applied || 0;
  const basePrice = priceBreakdown?.basePrice || 0;
  const roomSurcharge = priceBreakdown?.roomSurcharge || 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-gray-200 dark:bg-gray-600 rounded">
          <DollarSign className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          ราคาแพ็กเกจ
        </span>
        {isEarlyBird && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-800 rounded-full ml-auto">
            <Clock className="h-2 w-2 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Early Bird
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {/* Accommodation Type */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {getAccommodationText(
            registration.hotel_choice,
            registration.room_type,
            registration.external_hotel_name,
          )}
        </div>

        {/* Price Breakdown */}
        <div className="space-y-1">
          {basePrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                ราคาพื้นฐาน:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                ฿{basePrice.toLocaleString()}
              </span>
            </div>
          )}

          {roomSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                ค่าห้องเดี่ยว:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                +฿{roomSurcharge.toLocaleString()}
              </span>
            </div>
          )}

          <div className="border-t border-gray-300 dark:border-gray-500 pt-1">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-900 dark:text-gray-100">
                รวมทั้งสิ้น:
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                ฿{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
