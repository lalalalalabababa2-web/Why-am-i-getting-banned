cmake_minimum_required(VERSION 3.22.1)
project(offlineai LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LLAMA_SRC ${CMAKE_CURRENT_LIST_DIR}/../../../../third_party/llama.cpp)

# llama.cpp is built as shared libraries with every ARM CPU variant as its own module
# (armv8.0 up to armv9.2); at start-up ggml picks the best one this phone's CPU supports.
# On an S24 FE that is a variant with dot products and int8 matrix multiply.
set(BUILD_SHARED_LIBS ON)
if(ANDROID_ABI STREQUAL "x86_64")
    set(GGML_SYSTEM_ARCH "x86")  # emulator builds for the on-device tests only
else()
    set(GGML_SYSTEM_ARCH "ARM")
endif()
set(GGML_NATIVE OFF)
set(GGML_BACKEND_DL ON)
set(GGML_CPU_ALL_VARIANTS ON)
set(GGML_OPENMP OFF)        # ggml's own thread pool; nothing extra to package
set(GGML_CPU_KLEIDIAI OFF)  # helps Q4_0 models only, and would download at configure time
set(GGML_LLAMAFILE OFF)
set(LLAMA_BUILD_COMMON ON)
set(LLAMA_BUILD_TESTS OFF)
set(LLAMA_BUILD_EXAMPLES OFF)
set(LLAMA_BUILD_TOOLS OFF)
set(LLAMA_BUILD_SERVER OFF)
set(LLAMA_BUILD_APP OFF)
set(LLAMA_OPENSSL OFF)
set(LLAMA_SUBPROCESS OFF)
set(LLAMA_BUILD_UI OFF)
# pictures and sound: the multimodal library, without its command-line tools and without video
# (its video path runs ffmpeg as a separate program; the app extracts frames itself)
set(LLAMA_BUILD_MTMD ON)
set(MTMD_VIDEO OFF CACHE BOOL "" FORCE)

# Offline AI's own changes to llama.cpp (faster ARM kernels for the Bonsai formats)
execute_process(COMMAND sh ${CMAKE_CURRENT_LIST_DIR}/../../../../third_party/patches/apply.sh RESULT_VARIABLE OA_PATCH_RESULT)
if(NOT OA_PATCH_RESULT EQUAL 0)
    message(FATAL_ERROR "third_party/patches/apply.sh failed")
endif()

add_subdirectory(${LLAMA_SRC} llama-build)

add_library(offlineai SHARED
        jni_bridge.cpp
        engine.cpp)

target_include_directories(offlineai PRIVATE
        ${CMAKE_CURRENT_LIST_DIR}
        ${LLAMA_SRC}/include
        ${LLAMA_SRC}/common
        ${LLAMA_SRC}/ggml/include
        ${LLAMA_SRC}/src
        ${LLAMA_SRC}/tools/mtmd
        ${LLAMA_SRC}/vendor)

target_link_libraries(offlineai
        llama
        llama-common
        mtmd
        android
        log)
