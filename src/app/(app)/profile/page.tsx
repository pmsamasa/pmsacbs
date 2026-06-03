import { updateProfileAction } from "@/app/actions/profile";
import { ActionForm } from "@/components/action-form";
import { PasswordChangePanel } from "@/components/password-change-panel";
import { ProfilePhotoUploader } from "@/components/profile-photo-uploader";
import { classOptions } from "@/lib/constants";
import { requireRole } from "@/lib/data";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile } = await requireRole(["customer", "manager", "head"]);
  const readonlyCustomer = profile.role === "customer";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="section-title">Profile Settings</h1><p className="section-subtitle">Keep your contact details and profile photo updated so the bank team can recognize every account clearly.</p></div>
      <section className="glass-card p-5">
        <div className="mb-6">
          <ProfilePhotoUploader userId={profile.id} initialUrl={profile.photo_url} label={`${profile.name || profile.cic_no} (${profile.role})`} />
        </div>
        <ActionForm action={updateProfileAction} submitLabel="Save profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Name<input className="input" name="name" defaultValue={profile.name ?? ""} readOnly={readonlyCustomer} /></label>
            <label className="field-label">CIC number<input className="input" name="cic_no" defaultValue={profile.cic_no ?? ""} readOnly={readonlyCustomer} required={profile.role === "head"} /></label>
            <label className="field-label">Class
              <select className="input" name="class_name" defaultValue={profile.class_name ?? ""}>
                <option value="">Select class</option>
                {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </label>
            <label className="field-label">Phone<input className="input" name="phone" defaultValue={profile.phone ?? ""} /></label>
            <label className="field-label sm:col-span-2">Email<input className="input" name="email" defaultValue={profile.email ?? ""} readOnly={readonlyCustomer} /></label>
            {profile.role === "manager" ? (
              <>
                <label className="field-label">Assistant name<input className="input" name="assistant_manager_name" defaultValue={profile.assistant_manager_name ?? ""} /></label>
                <label className="field-label">Assistant CIC<input className="input" name="assistant_manager_cic_no" defaultValue={profile.assistant_manager_cic_no ?? ""} /></label>
                <label className="field-label">Assistant class
                  <select className="input" name="assistant_manager_class" defaultValue={profile.assistant_manager_class ?? ""}>
                    <option value="">Select class</option>
                    {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <label className="field-label">Assistant phone<input className="input" name="assistant_manager_phone" defaultValue={profile.assistant_manager_phone ?? ""} /></label>
                <label className="field-label sm:col-span-2">Assistant email<input className="input" name="assistant_manager_email" defaultValue={profile.assistant_manager_email ?? ""} /></label>
              </>
            ) : null}
          </div>
        </ActionForm>
      </section>
      <PasswordChangePanel email={profile.email} />
    </div>
  );
}
