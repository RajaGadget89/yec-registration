**Update: 9-AUG-25 [10:55]**

# 🧖 Frontend:Website

## USERS POV:
### 1️⃣ Users POV:  New Attendee Registered
#### Mermaid Code:
```mermaid
flowchart TD

A[Landing Page: User fills out form] --> B[Preview Page: Review User Data]
B --> C{Preview Page: User choose PDPA option}
C --> |Preview Page: Edit information| A
C --> |Preview Page: PDPA Accepted| D{Preview Page: User choose}
D --> |Preview Page: User Unchecked| B
D --> |Preview Page: Edit information| A
D --> |Preview Page: PDPA Accepted & Submit| E[Register Status Page: Display User Tracking code]
E --> A[Landing Page: Display Hero Video]
```
#### PNG File:
![[admin-dashbaord2 1.png]]
### 2️⃣ User POV: User Received System Email for Editing User Info:
#### Mermaid Code:

```mermaid
flowchart TD

A[Email Notification: User receive email to update info] --> B[Email Notification: User clicks reference link]
B --> C[Email Notification: Redirect to Registration form page]
C --> D[API: Load user existing info to allow user update info]
D --> E[Registration Form: Present User info]
E --> F[Registration Form: User edit their info and submit]
F --> G[Preview Page: Review User Data]
G --> H{Preview Page: User choose PDPA option}
H --> |Preview Page: Edit information| E
H --> |Preview Page: PDPA Accepted| I{Preview Page: User choose}
I --> |Preview Page: User Unchecked| G
I --> |Preview Page: Edit information| E
I --> |Preview Page: PDPA Accepted & Submit| J[Register Status Page: Display User Tracking Existing code]
J --> K[API: Update User Info in DB and Set status user DB to Waiting for Review]
K -->L[Landing Page: Display Hero Video]
```

#### PNG File:
![[admin-dashbaord2 2.png]]

---
## SYSTEM POV:

### 1️⃣ System POV: New Attendee Registered/Revise Existing Users Info (Expectation):
#### Mermaid Code:
```mermaid
flowchart TD

A[Landing Page: User fills out form] --> B[Save User Data in Browser Cache and Upload user images to Supabase 3 buckets]
B --> C1[API: Upload Chamber card → Supabase chamber-cards bucket]
B --> C2[API: Upload Payment Slip → Supabase payment-slips bucket]
B --> C3[API: Upload Profile image → Supabase profile-images bucket]
C1 --> D[Preview Page: Display User Info]
C2 --> D[Preview Page: Display User Info]
C3 --> D[Preview Page: Display User Info]
D --> E{User Option}

E --> |Preview Page: Edit User Info| F[Load User Data & 3 Images to form] --> A
E --> |Preview Page: PDPA Accepted| G{Preview Page: User choose}
G --> |Preview Page: User Unchecked| D
G --> |Preview Page: Edit User Info| F

G --> |Preview Page: PDPA Accepted & Submit Form| H{Preview Page: User Existing Check in DB}
H --> |Preview Page: 'Yes' means already registered| I[Preview Page: Send Notification to user]
I --> A
H --> J[Register Status Page: Display User Tracking code]
J --> K[API: Save User info and save current 3 images url in Supabase registrations table and put attendee stutus field to 'Waiting for Review' in DB]
J --> L[API: Mark PDPA 'Accepted' status in 'PDPA' field in 'registrations' table]
J --> M[API: Send Email to User with Tracking code with 'Waiting confirmation Email from Admin' message]
J --> N[Register Success Status Page: Display User Tracking code]
N --> A
```

#### PNG File:
![[admin-dashbaord2 4.png]]



---
# 👨‍💼Backend: Admin Dashboard

## 1️⃣ Admin Team POV: New Attendee Register or Edit Users info
### Mermaid Code:
```mermaid
flowchart TD

A[Registration Form] --> B[Preview Page: User Submit Data]
B --> C{Preview Page: User Existing Check in DB}
C --> |Preview Page: 'Yes' means already registered| D[Preview Page: Send Notification to user]
D --> A
C --> |No Existing User in DB| E[Register Status Page: Display User Tracking code]
E --> Fa[API: Save User Data in Browser Cache and Upload user images to Supabase 3 buckets]
E --> Fb[API: Mark PDPA 'Accepted' status in 'PDPA' field in 'registrations' table]
E --> Fc[API: Send Email to User with Tracking code with 'Waiting confirmation Email from Admin' message]
E --> Fd[API: Send Notification to Telegram Admin Group 'New Attendee Added]
E --> Fe[API: Mark up user status in DB to 'Waiting for Review']

Fa --> J[Admin Dashboard]
Fb --> J
Fc --> J
Fd --> J
Fe --> J
J --> Ja[API: Load Users Lists by filtering 'Waiting for Review' in Supabase DB]
Ja --> K[Waiting Review Page: Show all New users in table/waiting for review list]
K --> L[Waiting Review Page: Select New Attendee for review]
L --> N{Review Attendee Page: Review Info and Condition}
N --> |Review Attendee Page: Payment Slip incorrect| Na[API: Send Email to user for updating Payment Slip]
Na --> Nb[API: Set user status for Waiting User Update Payment info]
N --> |Review Attendee Page: User Profile or info invalid| Oa[API: Send Email to user for updating User info]
Oa --> Ob[API: Set user status for Waiting User Update info]
N --> |Review Attendee Page: TCC Card invalid| Pa[API: Send Email to user for updating New TCC card info]
Pa --> Pb[API: Set user status for Waiting User Update TCC card info]
N --> |Review Attendee Page: All confitions are PASSED| Q[API: Mark Status in Supabase DB for 'Accepted attend seminar']
Q --> Qa[API: Create a yec badges card']
Q --> Qb[API: Send Email notification to user 'Congratulation: We will wait for you at Seminar' and present badges card in email content 'please save the badges card]
Q --> J
Qa --> J
Qb --> J
```
### PNG File:
![[admin-dashbaord2.png]]