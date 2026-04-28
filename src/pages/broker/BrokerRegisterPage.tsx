/**
 * BrokerRegisterPage.tsx
 * 5-step application form for brokers to apply to join the ListHQ network.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";

const TOTAL_STEPS = 5;

const YEARS_OPTIONS = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

const STATE_OPTIONS = ["NSW", "VIC", "QLD", "SA", "WA", "ACT", "TAS", "NT"];

const SPECIALTY_OPTIONS = [
  "Residential home loans",
  "Investment property",
  "Refinancing",
  "First home buyer",
  "Self-employed / low-doc",
  "Commercial",
  "Construction",
  "Foreign buyer / FIRB",
  "SMSF",
];

const LANGUAGE_OPTIONS = [
  "English",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Hindi",
  "Arabic",
  "Korean",
  "Japanese",
  "Tamil",
  "Punjabi",
  "Bengali",
];

type Status = "idle" | "submitting" | "success" | "error";

export default function BrokerRegisterPage() {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [companyName, setCompanyName] = useState("");
  const [aclNumber, setAclNumber] = useState("");
  const [yearsBroker, setYearsBroker] = useState("");
  const [suburb, setSuburb] = useState("");
  const [stateCode, setStateCode] = useState("");

  // Step 3
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Step 4
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Step 5
  const [tagline, setTagline] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const canAdvance = (() => {
    if (step === 1) return fullName.trim() && isValidEmail && phone.trim();
    if (step === 2)
      return (
        companyName.trim() &&
        aclNumber.trim() &&
        yearsBroker &&
        suburb.trim() &&
        stateCode
      );
    if (step === 3) return selectedSpecialties.length > 0;
    if (step === 4) return selectedLanguages.length > 0;
    return true;
  })();

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");

    const payload = {
      name: fullName.trim(),
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: companyName.trim(),
      acl_number: aclNumber.trim(),
      suburb: suburb.trim(),
      state: stateCode,
      specialties: selectedSpecialties,
      loan_types: selectedSpecialties,
      languages: selectedLanguages,
      tagline: tagline.trim() || null,
      calendar_url: calendarUrl.trim() || null,
      photo_url: photoUrl.trim() || null,
      is_active: false,
      approval_status: "pending",
      agency_role: "principal",
    };

    const { error } = await (supabase as any)
      .from("brokers")
      .insert(payload as any);

    if (error) {
      setErrorMsg(
        error.message || "Could not submit your application. Please try again."
      );
      setStatus("error");
      return;
    }
    setStatus("success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            ListHQ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Broker Network Application
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {status === "success" ? (
            <div className="text-center py-6">
              <CheckCircle
                className="mx-auto mb-3 text-green-500"
                size={48}
              />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Application received
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll verify your ACL number and be in touch within 1 business
                day.
              </p>
              <Link
                to="/broker/login"
                className="inline-block mt-6 text-sm text-primary underline"
              >
                Back to broker login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Step {step} of {TOTAL_STEPS}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((step / TOTAL_STEPS) * 100)}%
                </p>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    About you
                  </h2>
                  <Field label="Full name" required>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputCls}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Email address" required>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      maxLength={255}
                    />
                  </Field>
                  <Field label="Mobile phone" required>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                      maxLength={30}
                    />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Your business
                  </h2>
                  <Field label="Company / brokerage name" required>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputCls}
                      maxLength={150}
                    />
                  </Field>
                  <Field
                    label="ACL number"
                    required
                    helper="Your Australian Credit Licence number from ASIC"
                  >
                    <input
                      type="text"
                      value={aclNumber}
                      onChange={(e) => setAclNumber(e.target.value)}
                      className={inputCls}
                      maxLength={30}
                    />
                  </Field>
                  <Field label="Years as a broker" required>
                    <select
                      value={yearsBroker}
                      onChange={(e) => setYearsBroker(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select…</option>
                      {YEARS_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Suburb" required>
                      <input
                        type="text"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        className={inputCls}
                        maxLength={100}
                      />
                    </Field>
                    <Field label="State" required>
                      <select
                        value={stateCode}
                        onChange={(e) => setStateCode(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select…</option>
                        {STATE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    Specialties
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Which loan types do you specialise in? (select all that
                    apply)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {SPECIALTY_OPTIONS.map((opt) => (
                      <CheckboxRow
                        key={opt}
                        label={opt}
                        checked={selectedSpecialties.includes(opt)}
                        onChange={() =>
                          setSelectedSpecialties((arr) => toggle(arr, opt))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    Languages
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Which languages do you advise clients in? (select all that
                    apply)
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <CheckboxRow
                        key={opt}
                        label={opt}
                        checked={selectedLanguages.includes(opt)}
                        onChange={() =>
                          setSelectedLanguages((arr) => toggle(arr, opt))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Your profile
                  </h2>
                  <Field
                    label="Tagline"
                    helper="One sentence about your approach, shown on your public profile"
                  >
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value.slice(0, 120))}
                      className={inputCls}
                      maxLength={120}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tagline.length}/120
                    </p>
                  </Field>
                  <Field
                    label="Booking / calendar URL"
                    helper="Your Calendly or Cal.com link so buyers can book directly"
                  >
                    <input
                      type="url"
                      value={calendarUrl}
                      onChange={(e) => setCalendarUrl(e.target.value)}
                      className={inputCls}
                      placeholder="https://calendly.com/…"
                      maxLength={300}
                    />
                  </Field>
                  <Field
                    label="Profile photo URL"
                    helper="A link to your headshot (can be added later)"
                  >
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className={inputCls}
                      placeholder="https://…"
                      maxLength={500}
                    />
                  </Field>
                </div>
              )}

              {status === "error" && (
                <p className="text-sm text-destructive mt-4">{errorMsg}</p>
              )}

              <div className="flex items-center justify-between gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 1 || status === "submitting"}
                  className="h-10"
                >
                  <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>

                {step < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canAdvance}
                    className="h-10"
                  >
                    Next <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={status === "submitting"}
                    className="h-10"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit application"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Already a registered broker?{" "}
          <Link to="/broker/login" className="underline text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {helper && (
        <p className="text-[11px] text-muted-foreground mt-1">{helper}</p>
      )}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 cursor-pointer text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
