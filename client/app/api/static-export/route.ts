import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const execAsync = promisify(exec);

/**
 * 静的エクスポートを実行し、結果をZIPファイルとして返すAPIエンドポイント
 * GET/POSTどちらのメソッドでも同じ処理を行う
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
    const appRoot = path.resolve(process.cwd());
    
    console.log("Starting static export process...");
    console.log(`App root: ${appRoot}`);
    console.log(`Running in Docker environment: ${process.env.DOCKER_ENV === "true"}`);
    console.log(`Running next build with export...`);
    
    const buildCommand = process.env.DOCKER_ENV === "true" 
      ? "cd /app && NEXT_PUBLIC_OUTPUT_MODE=export npx next build"
      : "npm run build:static";
    
    console.log(`Executing command: ${buildCommand}`);
    
    console.log(`Current working directory: ${appRoot}`);
    console.log(`Directory contents: ${fs.readdirSync(appRoot).join(', ')}`);
    
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: appRoot,
      env: {
        ...process.env,
        NEXT_PUBLIC_OUTPUT_MODE: "export",
        NODE_ENV: "production"
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    
    console.log("Static export stdout:", stdout);
    
    if (stderr && !stderr.includes("npm")) {
      console.error("Static export stderr:", stderr);
      return NextResponse.json(
        { error: "Static export failed", details: stderr },
        { status: 500, headers }
      );
    }
    
    const outDir = path.join(appRoot, "out");
    
    if (!fs.existsSync(outDir)) {
      return NextResponse.json(
        { error: "Static export failed - output directory not found" },
        { status: 500, headers }
      );
    }
    
    console.log(`Creating ZIP from directory: ${outDir}`);
    const zip = new JSZip();
    
    const addFilesToZip = (dirPath: string, relativePath: string = "") => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const zipPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          addFilesToZip(fullPath, zipPath);
        } else {
          const fileContent = fs.readFileSync(fullPath);
          zip.file(zipPath, fileContent);
        }
      }
    };
    
    addFilesToZip(outDir);
    
    console.log("Generating ZIP file...");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    console.log(`ZIP file generated, size: ${zipBuffer.length} bytes`);
    const response = new NextResponse(zipBuffer);
    
    response.headers.set("Content-Type", "application/zip");
    response.headers.set("Content-Disposition", "attachment; filename=static_export.zip");
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
