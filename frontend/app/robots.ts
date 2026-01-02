import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/profile",
          "/exams/create",
          "/exams/ai-generate",
          "/exams/my-exams",
          "/exams/*/edit",
          "/exams/*/take",
          "/exam-attempts/*",
          "/analytics",
          "/results",
          "/login",
          "/register",
          "/forgot-password",
          "/verify-code",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
