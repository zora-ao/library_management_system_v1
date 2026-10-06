import { useState } from "react";
import { 
  Pencil, 
  QrCode, 
  GraduationCap, 
  Contact, 
  BookOpen, 
  Copy,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { EditProfileModal } from "@/features/auth/components/EditProfileModal";
import { useBorrowHistory, useBorrows } from "@/hooks/useBorrows";


export default function StudentProfile() {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLibraryCardOpen, setIsLibraryCardOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch active borrows and history
  const { data: activeBorrows, isLoading: isLoadingBorrows } = useBorrows();
  const { data: borrowHistory, isLoading: isLoadingHistory } = useBorrowHistory();

  const activeCount = activeBorrows?.length ?? 0;
  const historyCount = borrowHistory?.length ?? 0;

  const student = user?.role === "student" ? user.student : null;

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto px-4 md:px-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Student Profile
        </h1>
        <p className="text-sm ">
          Manage your personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="h-28 bg-accent-foreground w-full" />

            {/* Avatar & Main Info */}
            <div className="px-6 pb-6 text-center -mt-14 space-y-3">
              <div className="relative inline-block">
                <img
                  src={
                    user?.avatar_url ||
                    "https://i.pinimg.com/236x/7f/14/88/7f1488d1276bd2a22354976d66845f6f.jpg?nii=t"
                  }
                  alt={user?.username || "Student avatar"}
                  className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-md mx-auto bg-slate-100"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {user?.username || "N/A"}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  {student?.course || "Computer Science"}
                </p>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {user?.role || "Student"}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2.5">
                <Button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="w-full rounded-xl text-xs h-10 font-medium cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit Profile
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsLibraryCardOpen(true)}
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs h-10 font-medium cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Show Library Card
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Information Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Academic Details Card */}
          <div className="bg-accent-foreground text-white rounded-2xl border p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-semibold text-base">
              <GraduationCap className="w-5 h-5" />
              Academic Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                  Student Number
                </span>
                <span className="text-sm font-semibold">
                  {student?.student_number || "Not set"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                  Course / Major
                </span>
                <span className="text-sm font-semibold">
                  {student?.course || "Not set"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                  Year Level
                </span>
                <span className="text-sm font-semibold">
                  {student?.year_level || "Not set"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                  Enrollment Status
                </span>
                <span className="text-sm font-semibold">
                  {student?.enrollment_status || "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Contact Info & Library Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-accent-foreground text-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100  font-semibold text-base">
                <Contact className="w-5 h-5 " />
                Contact Information
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold  uppercase tracking-wider block mb-1">
                    University Email
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold ">
                    <span>{user?.email || "Not set"}</span>
                    {user?.email && (
                      <button
                        onClick={handleCopyEmail}
                        className="hover:text-primary transition-colors p-1 cursor-pointer"
                        title="Copy email"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                    Phone Number
                  </span>
                  <span className="text-xs font-semibold">
                    {user?.phone || "Not set"}
                  </span>
                </div>
              </div>
            </div>

            {/* Library Activity Card with Dynamic Hooks */}
            <div className="bg-accent-foreground text-white rounded-2xl border  p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100  font-semibold text-base">
                <BookOpen className="w-5 h-5 " />
                Library Activity
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl p-4 text-center border">
                  <span className="block text-2xl font-bold  mb-1">
                    {isLoadingBorrows ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      activeCount
                    )}
                  </span>
                  <span className="text-[11px] font-medium leading-tight block">
                    Currently Borrowed
                  </span>
                </div>

                <div className=" rounded-xl p-4 text-center border ">
                  <span className="block text-2xl font-bold mb-1">
                    {isLoadingHistory ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto " />
                    ) : (
                      historyCount
                    )}
                  </span>
                  <span className="text-[11px] font-medium  leading-tight block">
                    Total History
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Library Card */}
      <Dialog open={isLibraryCardOpen} onOpenChange={setIsLibraryCardOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl p-0 overflow-hidden">
          <div className="flex items-center justify-between bg-accent-foreground px-6 py-4 text-white">
            <div>
              <DialogTitle className="text-sm font-bold tracking-widest uppercase">
                Library Card
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-300">
                Official member identification
              </DialogDescription>
            </div>
            <QrCode className="w-8 h-8 text-white/80" />
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.avatar_url ||
                  "https://i.pinimg.com/236x/7f/14/88/7f1488d1276bd2a22354976d66845f6f.jpg?nii=t"
                }
                alt={user?.username || "Member avatar"}
                className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-100"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user?.username || "N/A"}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role || "student"} member
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Member ID
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {user?.id ? String(user.id).slice(0, 8).toUpperCase() : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Member Since
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  University Email
                </span>
                <span className="text-xs font-semibold text-slate-800 break-all">
                  {user?.email || "Not set"}
                </span>
              </div>
              {student?.student_number && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Student Number
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {student.student_number}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}