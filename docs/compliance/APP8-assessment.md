# APP 8 Cross-Border Disclosure — Internal Assessment

**Status:** Internal record. NOT user-facing. Pending legal review.
**Owner:** Privacy Officer (privacy@listhq.com.au)
**Last reviewed:** 28 April 2026
**Next review:** On Sydney migration cutover, or 6 months from above date, whichever comes first.

---

## 1. Purpose

This document records ListHQ Pty Ltd's assessment under Australian Privacy Principle 8 (APP 8 — *Cross-border disclosure of personal information*) for the period during which ListHQ's primary backend (database, authentication, file storage) is hosted in Singapore (AWS region `ap-southeast-1`).

It also records why ListHQ relies primarily on **APP 8.2(b) (consent)** rather than APP 8.2(a) (substantially similar law) as the basis for offshore disclosure.

---

## 2. The disclosure

| Item | Detail |
|---|---|
| APP entity | ListHQ Pty Ltd (Australian small business operator; voluntarily complying with APPs) |
| Overseas recipient | Supabase Inc. (and underlying AWS infrastructure, AWS region `ap-southeast-1`, Singapore) |
| Categories of personal information | Account identifiers (email, phone, display name); agent business details (ABN, licence number, agency name); buyer/renter search preferences; tenancy records (incl. payment history); owner financial details; supplier/tradesperson details; uploaded documents; usage telemetry. Some of this is *sensitive information* under APP 3 (e.g. ID documents uploaded for verification). |
| Other overseas recipients | Resend (USA — transactional email), Stripe (USA — payments), Google (USA — Maps, OAuth, QR), PostHog (EU — analytics), Sentry (USA — error monitoring), hCaptcha (USA — bot detection), Lovable AI Gateway (routes to Google + OpenAI in USA/EU). |
| Purposes | Operate the ListHQ platform (database, auth, storage, email, payments, maps, analytics, error monitoring, anti-abuse, AI features). |

---

## 3. Why APP 8.2(b) — consent — is the primary basis

APP 8.1 makes the APP entity accountable for any act of the overseas recipient that would breach the APPs, **unless** an exception in APP 8.2 applies.

ListHQ relies on **APP 8.2(b)** (the individual consents to the cross-border disclosure after being expressly informed that APP 8.1 will not apply) as its **primary** basis, because:

1. **Express, informed consent is captured at the point of collection.**
   At signup, every agent and seeker must tick a checkbox stating:
   > *"I understand my data is stored on secure servers in Singapore. ListHQ complies with the Australian Privacy Act 1988."*

   The submit button is disabled until the box is ticked. The Privacy Policy linked from the same screen (section 4.1) expressly explains the APP 8 consequence — that ListHQ will not be accountable under APP 8.1 for the overseas recipient's acts to the extent the consent applies, while remaining accountable for its own conduct under the rest of the Privacy Act.

2. **The consent is granular and current.**
   It is given separately from the general Terms / Privacy acceptance, at the moment of account creation, and references the specific country of disclosure (Singapore).

3. **The consent is withdrawable.**
   Users may withdraw by closing their account or contacting the Privacy Officer. On withdrawal, personal information will be deleted or de-identified subject to the legal retention periods in Privacy Policy section 5 (notably the 7-year tenancy record retention for tax purposes).

4. **Pre-existing users will be re-consented before the Sydney migration.**
   See `data_location_consent_version` rollout plan (when implemented).

---

## 4. Why APP 8.2(a) — substantially similar law — is **not** the primary basis

APP 8.2(a) requires the APP entity to reasonably believe the overseas recipient is subject to a law or binding scheme that has the effect of protecting the information in a way that, overall, is at least substantially similar to the way in which the APPs protect the information, **and** that the individual is able to take action to enforce that protection.

Singapore's **Personal Data Protection Act 2012 (PDPA)** (administered by the Personal Data Protection Commission, PDPC) is broadly comparable to the APPs:

| APP area | PDPA equivalent | Comparable? |
|---|---|---|
| Consent (APP 3, 6) | PDPA s.13–17 (Consent Obligation) | Yes |
| Purpose limitation (APP 6) | PDPA s.18 (Purpose Limitation) | Yes |
| Notification (APP 5) | PDPA s.20 (Notification) | Yes |
| Access & correction (APPs 12, 13) | PDPA s.21, 22 (Access & Correction) | Yes |
| Data quality (APP 10) | PDPA s.23 (Accuracy) | Yes |
| Security (APP 11) | PDPA s.24 (Protection) | Yes |
| Retention limitation (APP 11.2) | PDPA s.25 (Retention Limitation) | Yes |
| Cross-border transfer (APP 8) | PDPA s.26 (Transfer Limitation) | Yes |
| Direct marketing (APP 7) | PDPA Do Not Call (Pt IX) + Consent Obligation | Partial — narrower scope |
| Anonymity / pseudonymity (APP 2) | No direct equivalent | **No** |
| Government identifiers (APP 9) | No direct equivalent | **No** |
| Sensitive information uplift (APP 3.3) | No specific "sensitive information" category | **Partial** |
| Notifiable Data Breaches (Pt IIIC) | PDPA s.26A–E (Mandatory Breach Notification, since 2021) | Yes |
| Individual enforcement | PDPC complaints mechanism + civil right of action (since 2021) | Yes, with limits |

**Conclusion:** The PDPA is comparable but **not identical** in scope, particularly around APP 2 (anonymity) and APP 9 (government identifiers). A reasonable case can be made for "substantially similar overall," but the Office of the Australian Information Commissioner has not formally designated Singapore as such, and reliance on APP 8.2(a) carries litigation risk if the assessment is later disputed.

We therefore **rely primarily on consent (APP 8.2(b))** and treat the PDPA comparability as a supporting factor only. This combined approach reduces the risk that any single ground fails on review.

---

## 5. Residual risk and mitigation

| Risk | Mitigation |
|---|---|
| User claims consent was not informed | Privacy Policy section 4.1 spells out APP 8 effect; checkbox sits adjacent to a Privacy Policy link; checkbox text is fixed and reviewed; consent timestamp + version stored on profile (planned). |
| Sensitive information (ID docs) disclosed offshore | Sensitive uploads are limited to identity verification and licence checks; treated under APP 3.3; included in the same consent. |
| AWS Singapore subpoena risk under foreign law | Documented in this assessment as residual risk; mitigated by Sydney migration milestone (6 months). |
| Sydney migration delayed beyond 6 months | Privacy Officer to re-assess and re-publish updated Privacy Policy; consent text reviewed; this document refreshed. |
| PDPA amended in a way that reduces equivalence | Privacy Officer to monitor PDPC announcements at next review. |

---

## 6. Migration milestone — Singapore → Sydney

Funded migration to AWS `ap-southeast-2` (Sydney) is planned within 6 months of the date above. On cutover:

1. Update Privacy Policy section 4 to reflect Australian primary hosting.
2. Remove or rephrase the signup data-location consent checkbox.
3. Re-prompt existing users for updated consent (via `data_location_consent_version` bump on next login) — even though the migration is *toward* greater protection, fresh consent is cleaner.
4. Archive this document with a final note recording the cutover date.

---

## 7. Disclaimer

This is an internal record prepared by the engineering team to capture the reasoning behind the current APP 8 posture. It is **not** legal advice and has **not** been reviewed by external counsel. Before relying on this assessment in any regulatory or contractual context, obtain sign-off from a privacy lawyer admitted in Australia.
