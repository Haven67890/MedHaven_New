# University of Jos catalogue sources

The institutional catalogue seed in Supabase was verified against current official University of Jos sources on 1 October 2026.

## Primary sources

- [UNIJOS Academics](https://unijos.edu.ng/academics)
- [UNIJOS Academics catalogue](https://www.unijos.edu.ng/unijos-academics)
- [Faculty of Social Sciences](https://unijos.edu.ng/faculty-social-sciences)
- [Freedom of Information request](https://www.unijos.edu.ng/freedom-information-request)

The official faculty pages used for reconciliation include Agriculture, Architecture, Arts, Basic Clinical Sciences, Basic Medical Sciences, Clinical Sciences, Dental Sciences, Education, Engineering, Environmental Sciences, Health Sciences and Technology, Law, Management Sciences, Natural Sciences, Pharmaceutical Sciences, Social Sciences, and Veterinary Medicine. Communication and Media Studies and Computing were retained from the current official catalogue and Senate announcement despite incomplete linked faculty pages.

## Reconciliation notes

- Existing `Clinical Sciences`, `Social Sciences`, `Medicine & Surgery`, and `Political Science` rows were preserved by name and relationship.
- Faculty display names are stored without the `Faculty of` prefix to match the existing catalogue convention and the existing onboarding examples.
- The current official catalogue lists 19 faculties and 97 departments for University of Jos after excluding duplicates and retaining only explicitly sourced names.
- `Political Science` remains under `Social Sciences`.
- `Medicine & Surgery` remains under `Clinical Sciences`.
- Only `MedHaven` and `POLITEIA` remain active in `ecosystem_apps`; catalogue expansion does not grant other departments application access.
