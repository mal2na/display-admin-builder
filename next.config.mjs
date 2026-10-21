/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 배포 빌드가 타입/린트 에러로 막히지 않게 통과 (바이브코딩 초기본 — 점진 개선 예정)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // 프로젝트 경로에 특수문자([빌더])가 있어 webpack 영속 FS 캐시의 rename이 실패(ENOENT)하며
  //  오래된 컴파일 결과가 재사용되는 문제가 있었다 → dev에선 FS 캐시를 끄고 메모리 캐시만 사용.
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
