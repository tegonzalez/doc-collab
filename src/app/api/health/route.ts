import { NextResponse } from 'next/server';

export async function GET() {
  // Basic health check, can be expanded later (e.g., check DB connection)
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// Optional: Add OPTIONS method for CORS preflight if needed in the future
// export async function OPTIONS() {
//   return new Response(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*', // Adjust as needed
//       'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     },
//   });
// }
