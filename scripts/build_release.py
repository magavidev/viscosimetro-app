#!/usr/bin/env python3
"""Build frontend + packaged desktop distribution for current OS."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
UI_DIR = ROOT_DIR / "ui-viscosimetro"
SPEC_FILE = ROOT_DIR / "viscosimetro_app.spec"
DEFAULT_ARTIFACT_ROOT = ROOT_DIR / ".release"
NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"


def run_cmd(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    print(f"[run] ({cwd}) {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, cwd=str(cwd), check=True, env=env)


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
    parser.add_argument(
        "--artifact-root",
        default=str(DEFAULT_ARTIFACT_ROOT),
        help="Directory used for local build artifacts and packaged output.",
    )
    parser.add_argument(
        "--npm-cmd",
        default=NPM_CMD,
        help="npm executable to use. Useful when packaging with a portable Node installation.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    artifact_root = Path(args.artifact_root)
    if not artifact_root.is_absolute():
        artifact_root = (ROOT_DIR / artifact_root).resolve()
    pyinstaller_build_dir = artifact_root / "pyinstaller" / "build"
    pyinstaller_dist_dir = artifact_root / "pyinstaller" / "dist"
    npm_cmd = args.npm_cmd
    npm_cmd_path = Path(npm_cmd)
    if npm_cmd_path.exists():
        npm_cmd = str(npm_cmd_path.resolve())
        npm_cmd_path = Path(npm_cmd)
    command_env = os.environ.copy()
    if npm_cmd_path.exists():
        command_env["PATH"] = (
            f"{npm_cmd_path.resolve().parent}{os.pathsep}{command_env.get('PATH', '')}"
        )

    if not SPEC_FILE.is_file():
        raise FileNotFoundError(f"No se encontro spec file: {SPEC_FILE}")

    if not args.skip_frontend:
        ensure_command_exists(npm_cmd)
        run_cmd([npm_cmd, "ci"], UI_DIR, env=command_env)
        if args.skip_check:
            run_cmd([npm_cmd, "run", "build"], UI_DIR, env=command_env)
        else:
            run_cmd([npm_cmd, "run", "check"], UI_DIR, env=command_env)

    run_cmd(
        [
            args.python,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--clean",
            "--distpath",
            str(pyinstaller_dist_dir),
            "--workpath",
            str(pyinstaller_build_dir),
            str(SPEC_FILE),
        ],
        ROOT_DIR,
        env=command_env,
    )

    output_dir = pyinstaller_dist_dir / "viscosimetro_app"
    if not output_dir.exists():
        raise RuntimeError(f"No se genero salida esperada: {output_dir}")

    print(f"[ok] Build generado en: {output_dir}", flush=True)
    print("[info] PyInstaller empaqueta solo para el sistema operativo actual.", flush=True)
    print(f"[info] Artefactos temporales/locales: {artifact_root}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        raise SystemExit(1)
