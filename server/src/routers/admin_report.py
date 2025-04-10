import json
import os
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZipFile

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.responses import FileResponse, ORJSONResponse
from fastapi.security.api_key import APIKeyHeader

from src.config import settings
from src.schemas.admin_report import ReportInput
from src.schemas.report import Report, ReportStatus
from src.services.report_launcher import launch_report_generation
from src.services.report_status import load_status_as_reports, set_status, toggle_report_public_state
from src.utils.logger import setup_logger

slogger = setup_logger()
router = APIRouter()

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)


async def verify_admin_api_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


@router.get("/admin/reports")
async def get_reports(api_key: str = Depends(verify_admin_api_key)) -> list[Report]:
    return load_status_as_reports()


@router.post("/admin/reports", status_code=202)
async def create_report(report: ReportInput, api_key: str = Depends(verify_admin_api_key)):
    try:
        launch_report_generation(report)
        return ORJSONResponse(
            content=None,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except ValueError as e:
        slogger.error(f"ValueError: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        slogger.error(f"Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/admin/comments/{slug}/csv")
async def download_comments_csv(slug: str, api_key: str = Depends(verify_admin_api_key)):
    csv_path = settings.REPORT_DIR / slug / "final_result_with_comments.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    return FileResponse(path=str(csv_path), media_type="text/csv", filename=f"kouchou_{slug}.csv")


@router.get("/admin/reports/{slug}/status/step-json", dependencies=[Depends(verify_admin_api_key)])
async def get_current_step(slug: str):
    status_file = settings.REPORT_DIR / slug / "hierarchical_status.json"
    try:
        with open(status_file) as f:
            status = json.load(f)
        # 全体のステータスが "completed" なら、current_step も "completed" とする
        if status.get("status") == "completed":
            return {"current_step": "completed"}
        # current_job キーが存在しない場合も完了とみなす
        if "current_job" not in status:
            return {"current_step": "completed"}
        return {"current_step": status.get("current_job", "unknown")}
    except Exception:
        return {"current_step": "error"}


@router.delete("/admin/reports/{slug}")
async def delete_report(slug: str, api_key: str = Depends(verify_admin_api_key)):
    try:
        set_status(slug, ReportStatus.DELETED.value)
        return ORJSONResponse(
            content={"message": f"Report {slug} marked as deleted"},
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except ValueError as e:
        slogger.error(f"ValueError: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        slogger.error(f"Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.patch("/admin/reports/{slug}/visibility")
async def update_report_visibility(slug: str, api_key: str = Depends(verify_admin_api_key)) -> dict:
    try:
        is_public = toggle_report_public_state(slug)

        return {"success": True, "isPublic": is_public}
    except ValueError as e:
        slogger.error(f"ValueError: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        slogger.error(f"Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/admin/static-export")
async def create_static_export(api_key: str = Depends(verify_admin_api_key)):
    """
    静的ファイルをエクスポートし、ZIPファイルとして提供するエンドポイント
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            zip_path = temp_dir_path / "static_export.zip"

            repo_root = Path(__file__).parent.parent.parent.parent.resolve()
            script_path = repo_root / "server" / "scripts" / "static_export.sh"

            if not os.access(script_path, os.X_OK):
                raise HTTPException(status_code=500, detail="Static export script is not executable")

            process = subprocess.run(
                [script_path],
                capture_output=True,
                text=True,
            )

            if process.returncode != 0:
                slogger.error(f"静的エクスポート実行エラー: {process.stderr}")
                raise HTTPException(status_code=500, detail=f"Static export process failed: {process.stderr}")

            out_dir = repo_root / "out"
            if not out_dir.exists():
                raise HTTPException(status_code=500, detail="Static export failed - output directory not found")

            with ZipFile(zip_path, "w") as zipf:
                for file_path in out_dir.rglob("*"):
                    if file_path.is_file():
                        zipf.write(file_path, arcname=str(file_path.relative_to(out_dir)))

            return FileResponse(path=str(zip_path), media_type="application/zip", filename="static_export.zip")
    except subprocess.CalledProcessError as e:
        slogger.error(f"静的エクスポート実行エラー: {e.stderr}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Static export process failed: {e.stderr}") from e
    except Exception as e:
        slogger.error(f"Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
