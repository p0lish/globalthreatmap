import { NextResponse } from "next/server";
import { getNipahHospitals } from "@/lib/valyu";

export const dynamic = "force-dynamic";

// Cache the Nipah hospitals data in memory
let cachedHospitals: Awaited<ReturnType<typeof getNipahHospitals>> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
  try {
    // Return cached data if available and fresh
    if (cachedHospitals && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({
        hospitals: cachedHospitals,
        cached: true,
        timestamp: new Date(cacheTimestamp).toISOString(),
      });
    }

    const hospitals = await getNipahHospitals();

    // Update cache
    cachedHospitals = hospitals;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      hospitals,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Nipah hospitals:", error);

    // Return cached data on error if available
    if (cachedHospitals) {
      return NextResponse.json({
        hospitals: cachedHospitals,
        cached: true,
        error: "Using cached data due to fetch error",
        timestamp: new Date(cacheTimestamp).toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch Nipah hospitals" },
      { status: 500 }
    );
  }
}
