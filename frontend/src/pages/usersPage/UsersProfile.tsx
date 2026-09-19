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
import { useAuth } from "@/hooks/useAuth";
import { EditProfileModal } from "@/features/auth/components/EditProfileModal";
import { useBorrowHistory, useBorrows } from "@/hooks/useBorrows";


export default function StudentProfile() {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch active borrows and history
  const { data: activeBorrows, isLoading: isLoadingBorrows } = useBorrows();
  const { data: borrowHistory, isLoading: isLoadingHistory } = useBorrowHistory();

  const activeCount = activeBorrows?.length ?? 0;
  const historyCount = borrowHistory?.length ?? 0;

  const student = user?.role === "student" ? user : null;

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Profile
        </h1>
        <p className="text-sm text-slate-500">
          Manage your personal information and library credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="h-28 bg-slate-900 w-full" />

            {/* Avatar & Main Info */}
            <div className="px-6 pb-6 text-center -mt-14 space-y-3">
              <div className="relative inline-block">
                <img
                  src={
                    user?.avatar_url ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
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
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {user?.status || "Active Student"}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2.5">
                <Button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-10 font-medium cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit Profile
                </Button>

                <Button
                  variant="outline"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-semibold text-base">
              <GraduationCap className="w-5 h-5 text-slate-700" />
              Academic Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Student Number
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student?.student_number || "2023-10492"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Course / Major
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student?.course || "B.S. Computer Science"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Year Level
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student?.year_level || "Sophomore (2nd Year)"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Enrollment Status
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {student?.enrollment_status || "Full-Time"}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Contact Info & Library Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-semibold text-base">
                <Contact className="w-5 h-5 text-slate-700" />
                Contact Information
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    University Email
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <span>{user?.email || "Not set"}</span>
                    {user?.email && (
                      <button
                        onClick={handleCopyEmail}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                        title="Copy email"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {user?.phone || "+1 (555) 123-4567"}
                  </span>
                </div>
              </div>
            </div>

            {/* Library Activity Card with Dynamic Hooks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-semibold text-base">
                <BookOpen className="w-5 h-5 text-slate-700" />
                Library Activity
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50/80 rounded-xl p-4 text-center border border-slate-100">
                  <span className="block text-2xl font-bold text-slate-900 mb-1">
                    {isLoadingBorrows ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                    ) : (
                      activeCount
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 leading-tight block">
                    Currently Borrowed
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-4 text-center border border-slate-100">
                  <span className="block text-2xl font-bold text-slate-900 mb-1">
                    {isLoadingHistory ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                    ) : (
                      historyCount
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 leading-tight block">
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
    </div>
  );
}