#!/usr/bin/env python3
"""
Scaffold CLAUDE.md architecture from config.

Usage:
    python scaffold.py config.yaml
    python scaffold.py --audit  # audit existing structure
"""

import argparse
import os
import sys
from pathlib import Path

# Templates
ROOT_TEMPLATE = """# {name}

{description}

## Commands
{commands}

## Structure
{structure}

## Critical
{critical}

## Shared
{imports}
"""

LAYER_TEMPLATE = """---
title: {title}
pattern: {pattern}
---

# {name}

{description}

## Golden Rules

{rules}

## Sublayers
{sublayers}
"""

LEAF_TEMPLATE = """# {name}

{description}

## Files
{files}

## Rules
{rules}
"""


def audit_existing(path: Path) -> dict:
    """Audit existing CLAUDE.md structure."""
    results = {
        "files": [],
        "total_tokens": 0,
        "issues": []
    }
    
    for claude_file in path.rglob("CLAUDE*.md"):
        content = claude_file.read_text()
        word_count = len(content.split())
        token_estimate = int(word_count * 1.3)
        
        rel_path = claude_file.relative_to(path)
        depth = len(rel_path.parts) - 1
        
        results["files"].append({
            "path": str(rel_path),
            "tokens": token_estimate,
            "depth": depth
        })
        results["total_tokens"] += token_estimate
        
        # Check issues
        if depth == 0 and token_estimate > 150:
            results["issues"].append(f"Root too large: {token_estimate} tokens (target: 100-150)")
        elif depth == 1 and token_estimate > 400:
            results["issues"].append(f"{rel_path}: Layer too large: {token_estimate} tokens (target: 200-400)")
        elif depth >= 2 and token_estimate > 200:
            results["issues"].append(f"{rel_path}: Sublayer too large: {token_estimate} tokens (target: 100-200)")
        
        # Check for imports
        import_count = content.count("@")
        if import_count > 10:
            results["issues"].append(f"{rel_path}: Too many imports ({import_count})")
    
    return results


def print_audit(results: dict):
    """Print audit results."""
    print("\n=== CLAUDE.md Architecture Audit ===\n")
    
    print("Files found:")
    for f in sorted(results["files"], key=lambda x: x["path"]):
        indent = "  " * f["depth"]
        print(f"  {indent}{f['path']}: ~{f['tokens']} tokens")
    
    print(f"\nTotal estimated tokens: {results['total_tokens']}")
    
    if results["issues"]:
        print("\n⚠️  Issues:")
        for issue in results["issues"]:
            print(f"  - {issue}")
    else:
        print("\n✅ No issues found")


def scaffold_from_config(config_path: Path, output_path: Path):
    """Scaffold structure from YAML config."""
    try:
        import yaml
    except ImportError:
        print("Error: PyYAML required. Install with: pip install pyyaml")
        sys.exit(1)
    
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    # Create root
    root_content = ROOT_TEMPLATE.format(
        name=config.get("name", "Project"),
        description=config.get("description", ""),
        commands="\n".join(f"- `{c}`" for c in config.get("commands", [])),
        structure="\n".join(f"- {s}" for s in config.get("structure", [])),
        critical="\n".join(config.get("critical", [])),
        imports="\n".join(config.get("imports", []))
    )
    
    root_file = output_path / "CLAUDE.md"
    root_file.write_text(root_content)
    print(f"Created: {root_file}")
    
    # Create layers
    for layer in config.get("layers", []):
        layer_path = output_path / layer["path"]
        layer_path.mkdir(parents=True, exist_ok=True)
        
        layer_content = LAYER_TEMPLATE.format(
            title=layer.get("title", layer["path"]),
            pattern=layer.get("pattern", ""),
            name=layer.get("name", layer["path"].split("/")[-1]),
            description=layer.get("description", ""),
            rules="\n".join(layer.get("rules", [])),
            sublayers="\n".join(layer.get("sublayers", []))
        )
        
        layer_file = layer_path / "CLAUDE.md"
        layer_file.write_text(layer_content)
        print(f"Created: {layer_file}")


def main():
    parser = argparse.ArgumentParser(description="Scaffold CLAUDE.md architecture")
    parser.add_argument("config", nargs="?", help="Config YAML file")
    parser.add_argument("--audit", action="store_true", help="Audit existing structure")
    parser.add_argument("--path", default=".", help="Project path")
    
    args = parser.parse_args()
    path = Path(args.path)
    
    if args.audit:
        results = audit_existing(path)
        print_audit(results)
    elif args.config:
        scaffold_from_config(Path(args.config), path)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
