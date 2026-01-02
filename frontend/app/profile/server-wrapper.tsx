import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfileServerWrapper() {
  try {
    const session = await requireAuth();
    const user = await getServerUser();

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
        }>("/teacher-student/teachers");
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
