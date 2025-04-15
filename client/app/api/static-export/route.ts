import { NextResponse } from "next/server";
import { execSync } from "child_process";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
  try {
    console.log("Starting static build...");
    
    fs.writeFileSync(
      path.resolve(process.cwd(), "next.config.static.ts"),
      `
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
      `
    );
    
    execSync("NEXT_PUBLIC_OUTPUT_MODE=export cp next.config.static.ts next.config.ts && npm run build:static", { stdio: "inherit" });
    console.log("Static build completed.");

    const zip = new AdmZip();
    const outDir = path.resolve(process.cwd(), "out");
    
    if (!fs.existsSync(outDir)) {
      return NextResponse.json(
        { error: "Static build output directory not found" },
        { status: 500 }
      );
    }

    const addDirectoryToZip = (dirPath: string, zipPath: string) => {
      const files = fs.readdirSync(dirPath);
      
      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const fileData = fs.readFileSync(filePath);
          zip.addFile(path.join(zipPath, file), fileData);
        } else if (stats.isDirectory()) {
          addDirectoryToZip(filePath, path.join(zipPath, file));
        }
      });
    };

    addDirectoryToZip(outDir, "");
    
    const zipBuffer = zip.toBuffer();
    
    return new Response(zipBuffer, {
      headers: {
        "Content-Disposition": "attachment; filename=static-export.zip",
        "Content-Type": "application/zip",
      },
    });
  } catch (error) {
    console.error("Error generating static export:", error);
    return NextResponse.json(
      { error: "Failed to generate static export" },
      { status: 500 }
    );
  }
}
