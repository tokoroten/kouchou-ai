import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = process.env.NEXT_PUBLIC_OUTPUT_MODE === "export" 
  ? "error" 
  : "force-dynamic";
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
    console.log("Static export request received");
    console.log("DOCKER_ENV:", process.env.DOCKER_ENV);
    
    if (process.env.DOCKER_ENV === "true") {
      console.log("Docker環境を検出しました。makeコマンドを実行します...");
      
      const appRoot = path.resolve(process.cwd(), "../..");
      console.log(`リポジトリルート: ${appRoot}`);
      
      console.log("make client-build-staticを実行中...");
      const { stdout, stderr } = await execAsync("make client-build-static", {
        cwd: appRoot,
        env: {
          ...process.env,
          NEXT_PUBLIC_OUTPUT_MODE: "export",
          NODE_ENV: "production"
        },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
      
      console.log("make stdout:", stdout);
      
      if (stderr && !stderr.includes("make")) {
        console.error("make stderr:", stderr);
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
    }
    else {
      console.log("非Docker環境を検出しました。直接makeコマンドを実行します...");
      
      const appRoot = path.resolve(process.cwd(), "../..");
      console.log(`リポジトリルート: ${appRoot}`);
      
      console.log("make client-build-staticを実行中...");
      const { stdout, stderr } = await execAsync("make client-build-static", {
        cwd: appRoot
      });
      
      console.log("make stdout:", stdout);
      
      if (stderr && !stderr.includes("make")) {
        console.error("make stderr:", stderr);
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
    }
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
