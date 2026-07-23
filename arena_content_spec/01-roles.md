# Arena V2 Content Spec — 01. Roles

Package 1 of 10. See `00-conventions-and-versioning.md` for shared versioning rules.

## Career Family scoping (blueprint §0)

Every role below is scoped under `careerFamily = "IT"`. This is the only family Arena V2 builds against in Phases 1-4:

```
Arena
 └─ Career Family
     ├─ IT              ← all 40 roles below live here (only implemented family)
     ├─ ECE             (reserved)
     ├─ EEE             (reserved)
     ├─ Mechanical      (reserved)
     ├─ Civil           (reserved)
     ├─ MBA             (reserved)
     ├─ Healthcare      (reserved)
     └─ ...             (reserved)
```

Every Challenge Payload carries `careerFamily`, hardcoded to `"IT"` for all Phase 2/3/4 work (see `08-challenge-templates-and-payload.md`). No non-IT content, workstation, or validator is being authored now — this reservation exists purely so a future family is a new branch under an existing root rather than a schema migration across every existing challenge payload, skill graph, and portfolio record.

## The 40 IT roles, by family

Full skill-dependency graphs for each role live in `03-learning-paths.md`; each role's allowed workstations/validators (Capability Registry) live in `02-skills-and-capabilities.md`. This package is the authoritative role list and family grouping only.

### Software Engineering (8)
1. Frontend Developer
2. Backend Developer
3. Full Stack Developer
4. Software Engineer (DSA)
5. Java Developer
6. Python Developer
7. C++ Developer
8. Game Developer

### Data & Analytics (6)
9. Data Analyst
10. Business Intelligence Analyst
11. Data Engineer
12. Database Administrator
13. Data Scientist
14. Machine Learning Engineer

### Cloud, Platform & DevOps (6)
15. DevOps Engineer
16. Site Reliability Engineer
17. Cloud Engineer (AWS)
18. Cloud Engineer (Azure)
19. Cloud Engineer (GCP)
20. Platform Engineer

### Security (5)
21. Cybersecurity Analyst
22. SOC Analyst / Incident Response
23. Penetration Tester
24. Security Engineer
25. Network Engineer

### QA & Testing (3)
26. QA / Test Automation Engineer
27. Manual QA Tester
28. API Test Engineer

### Mobile & Emerging Platforms (4)
29. Android Developer
30. iOS Developer
31. Embedded/IoT Software Engineer
32. Blockchain Developer

### Business, Data-Adjacent & IT Support (8)
33. Business Analyst (Tech)
34. Product Analyst
35. IT Support / Helpdesk Engineer
36. System Administrator
37. SAP Functional/Technical Consultant
38. Technical Writer / Docs Engineer
39. Technical Program/Project Manager
40. UI/UX Engineer (Design Systems)

## Sign-off

- [ ] Role list + family grouping — approved as listed, or amend
- [ ] Career Family extension point — approved, or amend

Cross-references: `02-skills-and-capabilities.md` (per-role capabilities), `03-learning-paths.md` (per-role skill graphs), `06-scenario-packs-and-datasets.md` §"role-family tagging".
