import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import ProfileClient from "./profile-client";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ProfileServerWrapperProps {
  searchParams?: {
    payment?: string;
    paymentId?: string;
    message?: string;
  };
}

export default async function ProfileServerWrapper({
  searchParams,
}: ProfileServerWrapperProps = {}) {
  try {
    // If payment success callback, revalidate balance tag first
    if (searchParams?.payment === "success" && searchParams?.paymentId) {
      try {
        // Verify payment server-side to ensure it's processed
        await fetchServerAPI<any>(
          `/payments/verify/${searchParams.paymentId}`,
          {
            method: "POST",
            cache: "no-store",
          }
        );
        // Revalidate balance tag to refresh profile data
        revalidateTag("balance");
      } catch (err) {
        // If verification fails, still revalidate to get fresh data
        revalidateTag("balance");
      }
    }

    // Fetch user with balance tag for cache revalidation
    // After revalidation, this will get fresh balance data
    const user = await getServerUser({ tags: ["balance", "exams"] });

    if (!user) {
      redirect("/login");
    }

    // Fetch teachers data if user is student
    let allTeachers: Teacher[] = [];
    let myTeachers: Teacher[] = [];

    if (user.role === "STUDENT") {
      try {
        const teachersResponse = await fetchServerAPI<{
          allTeachers: Teacher[];
          myTeachers: Teacher[];
        }>("/teacher-student/teachers", {
          next: { tags: ["teachers"] },
        });
        allTeachers = teachersResponse.allTeachers || [];
        myTeachers = teachersResponse.myTeachers || [];
      } catch (err) {
        console.error("Error fetching teachers:", err);
      }
    }

    return (
      <ProfileClient
        initialUser={user}
        initialAllTeachers={allTeachers}
        initialMyTeachers={myTeachers}
      />
    );
  } catch (error) {
    redirect("/login");
  }
}
