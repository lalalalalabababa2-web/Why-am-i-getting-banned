#!/usr/bin/env bash
# Builds Luau for this computer and runs the Lua tools' tests (test_lua.cpp): plain Lua, the
# Roblox test place and the checker, under AddressSanitizer and UBSan. Nothing is downloaded
# beyond the submodules.
#
#   tools/host-test/lua.sh            (from the repository root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LUAU="$ROOT/third_party/luau"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}/luau"
mkdir -p "$OUT"

if [ ! -f "$OUT/libLuau.Analysis.a" ]; then
  cmake -S "$LUAU" -B "$OUT" -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo -DLUAU_BUILD_CLI=OFF -DLUAU_BUILD_TESTS=OFF
  cmake --build "$OUT" --target Luau.Analysis Luau.Compiler Luau.VM
fi

g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer \
  -I "$ROOT/app/src/main/cpp" -I "$ROOT/third_party/llama.cpp/vendor" \
  -I "$LUAU/VM/include" -I "$LUAU/Compiler/include" -I "$LUAU/Ast/include" -I "$LUAU/Common/include" \
  -I "$LUAU/Analysis/include" -I "$LUAU/Config/include" \
  "$ROOT/app/src/main/cpp/lua_tools.cpp" "$ROOT/app/src/main/cpp/lua_check.cpp" "$ROOT/tools/host-test/test_lua.cpp" \
  -L "$OUT" -lLuau.Analysis -lLuau.Config -lLuau.Compiler -lLuau.Ast -lLuau.Bytecode -lLuau.VM -lLuau.Common -lpthread \
  -o "$OUT/test_lua"

"$OUT/test_lua" "$ROOT/app/src/main/assets/lua"
