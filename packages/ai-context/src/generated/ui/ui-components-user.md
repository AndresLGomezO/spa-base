# Component: user

Displays the signed-in user (name, email, photo, photo with name, or profile button menu).

**Properties:** display: name | email | photo | photo-and-name | profile-button, nameFormat?: full | first, imageSize?, avatarShape?: circle | rounded | square, profileButtonContent?: photo | full, label?, styles?

```json
{
  "kind": "user",
  "display": "profile-button",
  "profileButtonContent": "photo",
  "imageSize": 48,
  "avatarShape": "circle"
}
```
