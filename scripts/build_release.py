#!/usr/bin/env python3
"""Build frontend + packaged desktop distribution for current OS."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
UI_DIR = ROOT_DIR / "ui-viscosimetro"
SPEC_FILE = ROOT_DIR / "viscosimetro_app.spec"


def run_cmd(cmd: list[str], cwd: Path) -> None:
    print(f"[run] ({cwd}) {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, cwd=str(cwd), check=True)


def ensure_command_exists(command: str) -> None:
    if shutil.which(command) is None:
        raise RuntimeError(f"Comando requerido no disponible: '{command}'")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build release package for the current platform.",
    )
    parser.add_argument(
        "--skip-frontend",
        action="store_true",
        help="Skip frontend install/check/build.",
    )
    parser.add_argument(
        "--skip-check",
        action="store_true",
        help="Run frontend build without lint checks.",
    )
    parser.add_argument(
        "--python",
        default=sys.executable,
        help="Python executable used to run PyInstaller.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not SPEC_FILE.is_file():
        raise FileNotFoundError(f"No se encontro spec file: {SPEC_FILE}")

    if not args.skip_frontend:
        ensure_command_exists("npm")
        run_cmd(["npm", "ci"], UI_DIR)
        if args.skip_check:
            run_cmd(["npm", "run", "build"], UI_DIR)
        else:
            run_cmd(["npm", "run", "check"], UI_DIR)

    run_cmd(
        [args.python, "-m", "PyInstaller", "--noconfirm", "--clean", str(SPEC_FILE)],
        ROOT_DIR,
    )

    output_dir = ROOT_DIR / "dist" / "viscosimetro_app"
    if not output_dir.exists():
        raise RuntimeError(f"No se genero salida esperada: {output_dir}")

    print(f"[ok] Build generado en: {output_dir}", flush=True)
    print("[info] PyInstaller empaqueta solo para el sistema operativo actual.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        raise SystemExit(1)
