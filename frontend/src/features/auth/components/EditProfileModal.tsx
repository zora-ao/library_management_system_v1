import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useUpdateUserProfile } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user } = useAuth();
  const { mutate: updateUserProfile, isPending: isSubmitting } = useUpdateUserProfile();

  const student = user?.role === "student" ? user.student : null;

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    studentNumber: student?.student_number || "",
    course: student?.course || "",
    yearLevel: student?.year_level || "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        studentNumber: student?.student_number || "",
        course: student?.course || "",
        yearLevel: student?.year_level || "",
      });
      setAvatarFile(null);
    }
  }, [user, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct FormData for multipart/form-data
    const submitData = new FormData();
    submitData.append("username", formData.username);
    submitData.append("email", formData.email);
    submitData.append("phone", formData.phone);

    if (user?.role === "student") {
      submitData.append("student", "true"); // Backend checks `if student_data:`
      submitData.append("student_number", formData.studentNumber);
      submitData.append("course", formData.course);
      submitData.append("year_level", formData.yearLevel);
    }

    if (avatarFile) {
      submitData.append("avatar", avatarFile);
    }

    updateUserProfile(submitData as any, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error: any) => {
        console.error("Update failed:", error?.response?.data?.message || error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your account details and academic credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* File Upload Field */}
          <div className="space-y-1.5">
            <Label htmlFor="avatar" className="text-xs font-semibold">
              Profile Avatar
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="rounded-xl text-xs cursor-pointer file:text-xs file:font-semibold"
              />
            </div>
            {avatarFile && (
              <p className="text-[11px] text-emerald-600 font-medium">
                Selected: {avatarFile.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold">
                Full Name / Username
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                University Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="rounded-xl text-xs"
              />
            </div>

            {user?.role === "student" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="studentNumber" className="text-xs font-semibold">
                    Student Number
                  </Label>
                  <Input
                    id="studentNumber"
                    name="studentNumber"
                    value={formData.studentNumber}
                    onChange={handleChange}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="course" className="text-xs font-semibold">
                    Course / Major
                  </Label>
                  <Input
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="yearLevel" className="text-xs font-semibold">
                    Year Level
                  </Label>
                  <Input
                    id="yearLevel"
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleChange}
                    className="rounded-xl text-xs"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs min-w-[90px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}