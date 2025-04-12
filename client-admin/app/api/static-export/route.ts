import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * 静的エクスポートを実行し、結果をZIPファイルとして返すAPIエンドポイント
 * GET/POSTどちらのメソッドでも同じ処理を行う
 * 
 * このエンドポイントはclient側のstatic-exportエンドポイントにリクエストを転送し、
 * 結果をそのまま返します。これにより、client側でstatic exportを実行できます。
 */
async function handleExport(request: Request) {
  const origin = request.headers.get("origin") || "";
  
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  };
  
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers, status: 204 });
  }
  
  try {
    console.log("Forwarding static export request to client service...");
    
    const clientHost = process.env.DOCKER_ENV === "true" 
      ? "http://client:3000" 
      : process.env.CLIENT_API_URL || "http://localhost:3000";
    
    const clientApiUrl = `${clientHost}/api/static-export`;
    console.log(`Forwarding to: ${clientApiUrl}`);
    
    const clientResponse = await fetch(clientApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": request.headers.get("x-api-key") || "",
      },
    });
    
    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      console.error("Client static export API error:", errorText);
      return NextResponse.json(
        { error: "Static export failed", details: errorText },
        { status: clientResponse.status, headers }
      );
    }
    
    const zipBuffer = await clientResponse.arrayBuffer();
    console.log(`Received ZIP file from client, size: ${zipBuffer.byteLength} bytes`);
    
    const nextResponse = new NextResponse(zipBuffer);
    nextResponse.headers.set("Content-Type", "application/zip");
    nextResponse.headers.set("Content-Disposition", "attachment; filename=static_export.zip");
    
    Object.entries(headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value);
    });
    
    return nextResponse;
  } catch (error) {
    console.error("Static export error:", error);
    return NextResponse.json(
      { error: "Static export failed", details: String(error) },
      { status: 500, headers }
    );
  }
}

export async function GET(request: Request) {
  return handleExport(request);
}

export async function POST(request: Request) {
  return handleExport(request);
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || "";
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
