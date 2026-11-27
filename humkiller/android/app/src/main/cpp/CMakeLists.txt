cmake_minimum_required(VERSION 3.22.1)
project(humkiller LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The same DSP core the Mac app uses, shared from humkiller/core.
set(CORE ${CMAKE_CURRENT_LIST_DIR}/../../../../../core)

add_library(humkiller SHARED ${CORE}/hk_core.cpp hk_android.cpp)
target_include_directories(humkiller PRIVATE ${CORE})
target_compile_options(humkiller PRIVATE -O2 -Wall -Wextra)
target_link_libraries(humkiller aaudio log)
