# klicktipp-api

A node translation of php Wrapper of the klicktipp API.

Please see the documentation of the offical [PHP version] For more Information,.
## Install

```bash
npm i klicktipp-api
```

## Usage

```js
const KlicktippConnector = require("klicktipp-connector");

const test = async () => {
  const klicktippConnector = new KlicktippConnector();

  // Replace with username  && password
  const username = "username";
  const password = "password";

  console.log("login", await klicktippConnector.login(username, password));
  // do some stuff here for example
  const tags = await klicktippConnector.tagIndex();
  if (tags) {
    console.log("tags:", tags);
  } else {
    console.log("error:", klicktippConnector.getLastError());
  }
  console.log("logout", await klicktippConnector.logout());
};

test();
```

For more Information, see the documentation of the offical [PHP version].

[php version]: https://support.klicktipp.com/article/394-php-wrapper
