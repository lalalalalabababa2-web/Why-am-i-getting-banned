# The picture maker (stable-diffusion.cpp) built for this computer on llama.cpp's ggml, the way
# the app builds it, with a small program that makes one picture from a model file.
cmake_minimum_required(VERSION 3.22)
project(oa_image_test C CXX)
set(CMAKE_CXX_STANDARD 17)
set(ROOT ${CMAKE_CURRENT_LIST_DIR}/../..)
# stable-diffusion.cpp's tensor names are longer than ggml's default of 64 characters; every part
# has to be compiled with the same limit, or they disagree about the size of a tensor
add_compile_definitions(GGML_MAX_NAME=160)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE ON CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
add_subdirectory(${ROOT}/third_party/llama.cpp/ggml ggml-build)
set(SD_USE_UPSTREAM_GGML ON CACHE BOOL "" FORCE)
set(SD_GGML_SOURCE_DIR ${ROOT}/third_party/llama.cpp/ggml CACHE PATH "" FORCE)
set(SD_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(SD_WEBP OFF CACHE BOOL "" FORCE)
set(SD_WEBM OFF CACHE BOOL "" FORCE)
add_subdirectory(${ROOT}/third_party/stable-diffusion.cpp sd-build)
add_executable(sdtest sdtest.cpp)
target_link_libraries(sdtest stable-diffusion)
