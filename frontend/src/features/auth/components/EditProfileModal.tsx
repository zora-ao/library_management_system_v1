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

  const student = user?.role === "student" ? user : null;

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatarUrl: user?.avatar_url || "",
    studentNumber: student?.student_number || "",
    course: student?.course || "",
    yearLevel: student?.year_level || "",
  });

  // Re-sync form state when user changes or modal opens
  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        avatarUrl: user.avatar_url || "",
        studentNumber: student?.student_number || "",
        course: student?.course || "",
        yearLevel: student?.year_level || "",
      });
    }
  }, [user, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateUserProfile(
      {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        avatar_url: formData.avatarUrl,
        student_number: formData.studentNumber,
        course: formData.course,
        year_level: formData.yearLevel,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error: any) => {
          console.error("Update failed:", error?.response?.data?.message || error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your account details and academic details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl" className="text-xs font-semibold">
              Avatar Image URL
            </Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleChange}
              className="rounded-xl text-xs"
            />
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
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}