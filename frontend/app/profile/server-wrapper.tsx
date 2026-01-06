import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default async function ProfileServerWrapper() {
  try {
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
