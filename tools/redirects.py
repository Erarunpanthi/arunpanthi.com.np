"""Single source of truth for legacy/duplicate URL consolidation.

Every entry is (source route, target route). Source routes are the thin
placeholder pages and duplicated folders that Google reported as "Excluded by
'noindex' tag" / "Duplicate" / "Soft 404". Targets are always real, indexable
pages that already exist in this repository.

Consumers:
  * tools/build-redirect-pages.py  writes the placeholder file for each source
  * tools/generate-redirects.py    writes/validates the .htaccess rules and
                                   checks js/legacy-redirects.js agrees
  * 404.html + js/legacy-redirects.js implement the same map on hosts without
    .htaccess (this site is on GitHub Pages)
"""

# Past Questions subject placeholders -> the collection hub.
PAST_QUESTION_SUBJECTS = [
    "Airport-Engineering", "Building-Construction", "Concrete-Technology",
    "Construction-Management", "Construction-Materials", "Engineering-Drawing",
    "Engineering-Economics", "Engineering-Geology", "Engineering-Hydrology",
    "Estimation-Valuation", "Fluid-Mechanics", "Foundation-Engineering",
    "Hydraulics", "Hydropower-Engineering", "Irrigation-Engineering",
    "Professional-Practices", "Project-Management", "RCC-Design",
    "Sanitation-Engineering", "Soil-Mechanics", "Steel-Timber-Design",
    "Strength-of-Materials", "Surveying", "Theory-of-Structures",
    "Transportation-Engineering", "Water-Supply",
]

# NEC license notes placeholders. Engineering Drawing and Construction Materials
# have written notes (as .html files), so those two are not in this list.
NEC_NOTES_PLACEHOLDERS = [
    "Airport-Engineering", "Building-Construction-and-Drawings",
    "Concrete-Technology-and-Masonry-Structures", "Construction-Management",
    "Design-of-RCC-Structures", "Design-of-Steel-and-Timber-Structures",
    "Engineering-Economics", "Engineering-Geology", "Engineering-Hydrology",
    "Engineering-Professional-Practices", "Estimation-and-Valuation",
    "Fluid-Mechanics", "Foundation-Engineering", "Hydraulics",
    "Hydropower-Engineering", "Irrigation-Engineering", "Project-Management",
    "Sanitation-Engineering", "Soil-Mechanics", "Strength-of-Materials",
    "Surveying", "Theory-of-Structures", "Transportation-Engineering",
    "Water-Supply-Engineering",
]

# PSC syllabus placeholders whose syllabus is not published yet.
PSC_SYLLABUS_PLACEHOLDERS = [
    "ministry-physical-infrastructure-syllabus",
    "nea-syllabus",
    "nepal-oil-corporation-syllabus",
    "road-department-syllabus",
]

PAST_QUESTIONS_HUB = "/Resources/Past-Questions/"
NEC_NOTES_HUB = "/NEC-license-preparation/Notes/"
PSC_SYLLABUS_HUB = "/Psc-preparation/Syllabus/"

# source route -> (target route, page label, hub label)
PLACEHOLDERS: dict[str, tuple[str, str, str]] = {}

for _subject in PAST_QUESTION_SUBJECTS:
    PLACEHOLDERS[f"/Resources/Past-Questions/{_subject}"] = (
        PAST_QUESTIONS_HUB,
        _subject.replace("-", " ") + " past questions",
        "Civil Engineering Past Questions",
    )

for _subject in NEC_NOTES_PLACEHOLDERS:
    PLACEHOLDERS[f"/NEC-license-preparation/Notes/{_subject}"] = (
        NEC_NOTES_HUB,
        _subject.replace("-", " ") + " notes",
        "Civil Engineering Notes",
    )

for _body in PSC_SYLLABUS_PLACEHOLDERS:
    PLACEHOLDERS[f"/Psc-preparation/Syllabus/{_body}"] = (
        PSC_SYLLABUS_HUB,
        _body.replace("-", " ") + " syllabus",
        "PSC Syllabus",
    )

PLACEHOLDERS.update({
    "/NEC-license-preparation/exam-preparation": (
        "/NEC-license-preparation/", "NEC license exam preparation",
        "NEC License Preparation",
    ),
    "/NEC-license-preparation/MCQ": (
        "/NEC-license-preparation/Test/", "NEC license MCQ practice",
        "NEC License Practice Tests",
    ),
    "/Psc-preparation/Syllabus/nepal-telecom-syllabus": (
        "/Psc-preparation/Syllabus/Nepal-telecom", "Nepal Telecom syllabus",
        "Nepal Telecom Syllabus",
    ),
})

# Routes that were pure duplicates (files deleted, map only).
DUPLICATES: dict[str, str] = {
    "/Home.html": "/",
    "/Home": "/",
    "/Home/": "/",
    "/Home/Notes": "/NEC-license-preparation/Notes",
    "/Home/Solutions": "/Resources/Solutions",
    "/Home/past-questions": "/Resources/Past-Questions",
}

# Hand-written forwarding pages (not generated) that the audit still validates:
#   Psc-preparation/Psc-video/index.html -> /Psc-video/
HANDWRITTEN_REDIRECTS: dict[str, str] = {
    "/Psc-preparation/Psc-video": "/Psc-video/",
}

# The notes copy moved from the extension-less file URL (/.../Engineering-Drawing,
# what Google was already indexing) into a folder, so the folder form is the one
# that has to forward. Keeping the already-indexed URL stable avoids a reindex.
MOVED_FILES: dict[str, str] = {
    "/NEC-license-preparation/Notes/Engineering-Drawing.html":
        "/NEC-license-preparation/Notes/Engineering-Drawing/",
    "/NEC-license-preparation/Notes/Construction-Materials.html":
        "/NEC-license-preparation/Notes/Construction-Materials/",
}
