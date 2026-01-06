import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ana Səhifə",
  description:
    "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli. Yüksək nəticələr göstər, mükafatlar qazan!",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Online İmtahan Platforması - AI dəstəklı imtahan sistemi",
    description:
      "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli. Yüksək nəticələr göstər, mükafatlar qazan!",
  },
};

export default function Home() {
  // Structured Data (JSON-LD) for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Online İmtahan Platforması",
    description:
      "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AZN",
    },
    featureList: [
      "AI dəstəklı imtahan yaratma",
      "Real-time nəticələr",
      "Mükafat sistemi",
      "Balans sistemi",
      "Online imtahan verə bilmə",
    ],
    provider: {
      "@type": "Organization",
      name: "Online İmtahan Platforması",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
        {/* Hero Section */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-center">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg transform hover:scale-105 transition-transform">
              <div className="text-white text-3xl font-bold flex flex-col items-center justify-center">
                <span
                  className="leading-none"
                  role="img"
                  aria-label="İmtahan kağızı"
                >
                  📝
                </span>
                <span className="text-xs mt-1 font-semibold">EXAM</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Online İmtahan Platforması
            </h1>

            <p className="text-base md:text-lg text-gray-600 mb-3 max-w-3xl mx-auto leading-relaxed">
              AI dəstəklı online imtahan sistemi - müəllimlər üçün asan,
              şagirdlər üçün şəffaf və sürətli
            </p>

            {/* Marketing Highlights */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs md:text-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-green-700 font-semibold">
                <span
                  className="text-base"
                  role="img"
                  aria-label="Mükafat kuboku"
                >
                  🏆
                </span>
                <span>Yüksək nəticələr göstər, mükafatlar qazan!</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-full text-purple-700 font-semibold">
                <span className="text-base" role="img" aria-label="Hədiyyə">
                  🎁
                </span>
                <span>İlk 3 yerə pul mükafatı - 10, 7, 3 AZN</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full text-blue-700 font-semibold">
                <span className="text-base" role="img" aria-label="Sürət">
                  ⚡
                </span>
                <span>
                  Qazanılan mükafatlarla növbəti imtahanlara pulsuz qoşul
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
              <Link
                href="/register"
                aria-label="Qeydiyyatdan keç və indi başla"
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center"
              >
                İndi başla
                <span className="ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
              <Link
                href="/login"
                aria-label="Hesabına daxil ol"
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Daxil ol
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="group relative bg-white/80 backdrop-blur-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-10 -mt-10 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <span className="text-2xl" role="img" aria-label="Məqsəd">
                    🎯
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Asan İstifadə
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  3 klikdə AI dəstəyi ilə imtahan yaradın və idarə edin
                </p>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full -mr-10 -mt-10 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <span className="text-2xl" role="img" aria-label="Statistika">
                    📊
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Şəffaf Nəticələr
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  İmtahan bitdikdən dərhal sonra nəticələri görüntüləyin və
                  liderlər cədvəlində yerinizi görün
                </p>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full -mr-10 -mt-10 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <span className="text-2xl" role="img" aria-label="AI">
                    🤖
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  AI Dəstəyi
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  AI texnologiyası ilə sürətli və keyfiyyətli imtahan hazırlayın
                </p>
              </div>
            </div>
          </div>

          {/* Marketing Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div
                  className="text-3xl flex-shrink-0"
                  role="img"
                  aria-label="Məqsəd"
                >
                  🎯
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Yüksək nəticələr göstər, mükafatlar qazan!
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    İlk 3 yerə çıxan şagirdlər pul mükafatı qazanır.
                    Qazandığınız mükafatlar balansınıza əlavə olunur və növbəti
                    imtahanlarda istifadə edə bilərsiniz!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div
                  className="text-3xl flex-shrink-0"
                  role="img"
                  aria-label="Almaz"
                >
                  💎
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Balans sistemi ilə rahat ödəniş
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Balansınıza pul əlavə edin və istədiyiniz imtahan üçün
                    istifadə edin. Mükafat qazandıqdan sonra balansınız
                    avtomatik artır və növbəti imtahanlara pulsuz qoşula
                    bilərsiniz!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
              <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Hazırsınız? İndi başlayaq!
                </h2>
                <p className="text-base text-indigo-100 mb-1 max-w-2xl mx-auto">
                  Yüksək nəticələr göstər, mükafatlar qazan və növbəti
                  imtahanlara pulsuz qoşul!
                </p>
                <p className="text-sm text-indigo-200 mb-4 max-w-2xl mx-auto">
                  Platformamızı sınayın və imtahan yaratmağın nə qədər asan
                  olduğunu görün
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/register"
                    aria-label="Pulsuz qeydiyyatdan keç"
                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-base transform hover:scale-105"
                  >
                    Pulsuz qeydiyyatdan keç{" "}
                    <span role="img" aria-label="Raketa">
                      🚀
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
