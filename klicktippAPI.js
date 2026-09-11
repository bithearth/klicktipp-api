const axios = require("axios");

class KlicktippConnector {
  constructor(service = "https://api.klicktipp.com", { timeout = 15000, signal } = {}) {
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new TypeError("timeout must be a positive number");
    }
    this.timeout = timeout;
    this.signal = signal;
    this.error = "";
    this.baseURL = service;
    this.sessionName = "";
    this.sessionId = "";
  }

  /**
   * Get last error
   *
   * @return string an error description of the last error
   */
  getLastError = () => {
    return this.error;
  };

  /**
   * login
   *
   * @param username The login name of the user to login.
   * @param password The password of the user.
   * @return TRUE on success
   */
  login = async (username, password) => {
    this.sessionId = "";
    this.sessionName = "";
    if (!(username && password)) {
      throw this.createError("Login failed: Illegal Arguments", TypeError);
    }

    const res = await this.httpRequest(
      "/account/login",
      "POST",
      { username, password },
      false,
    );

    if (!res.data || typeof res.data.sessid !== "string" || !res.data.sessid ||
        typeof res.data.session_name !== "string" || !res.data.session_name) {
      throw this.createError("Login failed: invalid session response");
    }
    this.sessionId = res.data.sessid;
    this.sessionName = res.data.session_name;

    return true;
  };

  /**
   * Logs out the user currently logged in.
   *
   * @return TRUE on success
   */
  logout = async () => {
    try {
      await this.httpRequest("/account/logout", "POST");
      return true;
    } finally {
      this.sessionId = "";
      this.sessionName = "";
    }
  };

  /**
   * Get all subscription processes (lists) of the logged in user. Requires to be logged in.
   *
   * @return A associative obeject <list id> => <list name>
   */
  subscriptionProcessIndex = async () => {
    const res = await this.httpRequest("/list");

    return res.data;
  };

  /**
   * Get subscription process (list) definition. Requires to be logged in.
   *
   * @param listid The id of the subscription process
   *
   * @return An object representing the Klicktipp subscription process.
   */
  subscriptionProcessGet = async (listid) => {
    if (!listid || listid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // retrieve
    const res = await this.httpRequest(`/list/${listid}`);

    return res.data;
  };

  /**
   * Get subscription process (list) redirection url for given subscription.
   *
   * @param listid The id of the subscription process.
   * @param email The email address of the subscriber.
   *
   * @return A redirection url as defined in the subscription process.
   */
  subscriptionProcessRedirect = async (listid, email) => {
    if (!listid || listid === "" || !email || email === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // update
    const data = { listid, email };
    const res = await this.httpRequest("/list/redirect", "POST", data);

    return res.data;
  };
  /**
   * Get all manual tags of the logged in user. Requires to be logged in.
   *
   * @return A associative object <tag id> => <tag name>
   */
  tagIndex = async () => {
    const res = await this.httpRequest("/tag");

    return res.data;
  };

  /**
   * Get a tag definition. Requires to be logged in.
   *
   * @param tagid The tag id.
   *
   * @return An object representing the Klicktipp tag object.
   */
  tagGet = async (tagid) => {
    if (!tagid || tagid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }
    const res = await this.httpRequest(`/tag/${tagid}`);

    return res.data;
  };

  /**
   * Create a new manual tag. Requires to be logged in.
   *
   * @param name The name of the tag.
   * @param text (optional) An additional description of the tag.
   *
   * @return The id of the newly created tag.
   */
  tagCreate = async (name, text = "") => {
    if (!name || name === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }
    const data = { name };
    if (text !== "") {
      data.text = text;
    }
    const res = await this.httpRequest("/tag", "POST", data);

    return res.data;
  };

  /**
   * Updates a tag. Requires to be logged in.
   *
   * @param tagid The tag id used to identify which tag to modify.
   * @param name (optional) The new tag name. Set empty to leave it unchanged.
   * @param text (optional) The new tag description. Set empty to leave it unchanged.
   *
   * @return TRUE on success
   */
  tagUpdate = async (tagid, name = "", text = "") => {
    if (!tagid || tagid === "" || (name === "" && text === "")) {
      throw this.createError("Illegal Arguments", TypeError);
    }
    const data = {};
    if (name !== "") {
      data.name = name;
    }
    if (text !== "") {
      data.text = text;
    }

    const res = await this.httpRequest(`/tag/${tagid}`, "PUT", data);

    return true;
  };

  /**
   * Deletes a tag. Requires to be logged in.
   *
   * @param tagid The user id of the user to delete.
   *
   * @return TRUE on success
   */
  tagDelete = async (tagid) => {
    if (!tagid || tagid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    const res = await this.httpRequest(`/tag/${tagid}`, "DELETE");

    return true;
  };

  /**
   * Get all contact fields of the logged in user. Requires to be logged in.
   *
   * @return A associative object <field id> => <field name>
   */
  fieldIndex = async () => {
    const res = await this.httpRequest("/field");

    return res.data;
  };

  /**
   * Subscribe an email. Requires to be logged in.
   *
   * @param email The email address of the subscriber.
   * @param listid (optional) The id subscription process.
   * @param tagid (optional) The id of the manual tag the subscriber will be tagged with.
   * @param fields (optional) Additional fields of the subscriber.
   *
   * @return An object representing the Klicktipp subscriber object.
   */
  subscribe = async (
    email,
    listid = 0,
    tagid = 0,
    fields = {},
    smsnumber = ""
  ) => {
    if ((!email || email === "") && smsnumber === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }
    // subscribe
    const data = { email, fields };

    if (smsnumber !== "") {
      data.smsnumber = smsnumber;
    }
    if (listid !== 0) {
      data.listid = listid;
    }
    if (tagid !== 0) {
      data.tagid = tagid;
    }

    const res = await this.httpRequest("/subscriber", "POST", data);

    return res.data;
  };

  /**
   * Unsubscribe an email. Requires to be logged in.
   *
   * @param email The email address of the subscriber.
   *
   * @return TRUE on success
   */
  unsubscribe = async (email) => {
    if (!email || email === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // unsubscribe;
    const data = { email };

    const res = await this.httpRequest("/subscriber/unsubscribe", "POST", data);

    return true;
  };

  /**
   * Tag an email. Requires to be logged in.
   *
   * @param email The email address of the subscriber.
   * @param tagids an array of the manual tag(s) the subscriber will be tagged with.
   *
   * @return TRUE on success
   */
  tag = async (email, tagids) => {
    if (!email || email === "" || !tagids || tagids === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // tag
    const data = {
      email,
      tagids,
    };

    const res = await this.httpRequest("/subscriber/tag", "POST", data);

    return res.data;
  };

  /**
   * Untag an email. Requires to be logged in.
   *
   * @param mixed $email The email address of the subscriber.
   * @param mixed $tagid The id of the manual tag that will be removed from the subscriber.
   *
   * @return TRUE on success.
   */
  untag = async (email, tagid) => {
    if (!email || email === "" || !tagid || tagid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // subscribe
    const data = {
      email,
      tagid,
    };

    const res = await this.httpRequest("/subscriber/untag", "POST", data);

    return true;
  };

  /**
   * Resend an autoresponder for an email address. Requires to be logged in.
   *
   * @param email A valid email address
   * @param autoresponder An id of the autoresponder
   *
   * @return TRUE on success
   */
  resend = async (email, autoresponder) => {
    if (!email || email === "" || !autoresponder || autoresponder === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // resend/reset autoresponder
    const data = { email, autoresponder };

    const res = await this.httpRequest("/subscriber/resend", "POST", data);

    return true;
  };

  /**
   * Get all active subscribers. Requires to be logged in.
   *
   * @return An array of subscriber ids.
   */
  subscriberIndex = async () => {
    const res = await this.httpRequest("/subscriber");

    return res.data;
  };

  /**
   * Get subscriber information. Requires to be logged in.
   *
   * @param subscriberid The subscriber id.
   *
   * @return An object representing the Klicktipp subscriber.
   */
  subscriberGet = async (subscriberid) => {
    if (!subscriberid || subscriberid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // retrieve
    const res = await this.httpRequest(`/subscriber/${subscriberid}`);
    return res.data;
  };

  /**
   * Get a subscriber id by email. Requires to be logged in.
   *
   * @param email The email address of the subscriber.
   *
   * @return The id of the subscriber. Use subscriber_get to get subscriber details.
   */
  subscriberSearch = async (email) => {
    if (!email || email === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }
    // search
    const data = { email };
    const res = await this.httpRequest("/subscriber/search", "POST", data);

    return res.data;
  };

  /**
   * Get all active subscribers tagged with the given tag id. Requires to be logged in.
   *
   * @param tagid The id of the tag.
   *
   * @return An array with id -> subscription date of the tagged subscribers. Use subscriber_get to get subscriber details.
   */
  subscriberTagged = async (tagid) => {
    if (!tagid || tagid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // search
    const data = { tagid };
    const res = await this.httpRequest("/subscriber/tagged", "POST", data);

    return res.data;
  };

  /**
   * Updates a subscriber. Requires to be logged in.
   *
   * @param subscriberid The id of the subscriber to update.
   * @param fields (optional) The fields of the subscriber to update
   * @param newemail (optional) The new email of the subscriber to update
   *
   * @return TRUE on success
   */
  subscriberUpdate = async (
    subscriberid,
    fields = {},
    newemail = "",
    newsmsnumber = ""
  ) => {
    if (!subscriberid || subscriberid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // update
    const data = { fields };
    if (newemail !== "") {
      data.newemail = newemail;
    }
    if (newsmsnumber !== "") {
      data.newsmsnumber = newsmsnumber;
    }
    const res = await this.httpRequest(
      `/subscriber/${subscriberid}`,
      "PUT",
      data
    );
    return true;
  };

  /**
   * Delete a subscribe. Requires to be logged in.
   *
   * @param subscriberid The id of the subscriber to update.
   *
   * @return TRUE on success.
   */
  subscriberDelete = async (subscriberid) => {
    if (!subscriberid || subscriberid === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // delete
    const res = await this.httpRequest(`/subscriber/${subscriberid}`, "DELETE");

    return true;
  };
  /**
   * Subscribe an email. Requires an api key.
   *
   * @param apikey The api key (listbuildng configuration).
   * @param email The email address of the subscriber.
   * @param fields (optional) Additional fields of the subscriber.
   *
   * @return TRUE on success
   */
  signin = async (apikey, email, fields = {}, smsnumber = "") => {
    if (
      !apikey ||
      apikey === "" ||
      ((!email || email === "") && smsnumber === "")
    ) {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // subscribe
    const data = { apikey, email, fields };

    if (smsnumber !== "") {
      data.smsnumber = smsnumber;
    }
    const res = await this.httpRequest("/subscriber/signin", "POST", data);

    return true;
  };

  /**
   * Untag an email. Requires an api key.
   *
   * @param apikey The api key (listbuildng configuration).
   * @param email The email address of the subscriber.
   *
   * @return TRUE on success
   */
  signout = async (apikey, email) => {
    if (!apikey || apikey === "" || !email || email === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // untag
    const data = { apikey, email };
    const res = await this.httpRequest("/subscriber/signout", "POST", data);

    return true;
  };

  /**
   * Unsubscribe an email. Requires an api key.
   *
   * @param apikey The api key (listbuildng configuration).
   * @param email The email address of the subscriber.
   *
   * @return TRUE on success
   */
  signoff = async (apikey, email) => {
    if (!apikey || apikey === "" || !email || email === "") {
      throw this.createError("Illegal Arguments", TypeError);
    }

    // unsubscribe
    const data = { apikey, email };
    const res = await this.httpRequest("/subscriber/signoff", "POST", data);

    return true;
  };

  createError = (message, ErrorType = Error) => {
    this.error = message;
    return new ErrorType(message);
  };

  httpRequest = async (path, method = "GET", data, usesession = true, { signal = this.signal } = {}) => {
    this.error = "";
    const options = {
      baseURL: this.baseURL,
      method,
      url: path,
      data,
      timeout: this.timeout,
      signal,
      // Never forward session cookies to a redirect target.
      maxRedirects: 0,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    };
    if (usesession && this.sessionName && this.sessionId) {
      options.headers.Cookie = `${this.sessionName}=${this.sessionId}`;
    }

    try {
      return await axios(options);
    } catch (cause) {
      const status = cause.response?.status;
      const code = cause.code;
      this.error = `${method} ${path} failed: ${status ? `HTTP ${status}` : (code || "Network error")}`;
      const error = new Error(this.error);
      error.name = "KlicktippError";
      error.code = code;
      error.status = status;
      error.details = cause.response?.data;
      // Do not expose Axios config: it can contain passwords and cookies.
      throw error;
    }
  };
}

module.exports = KlicktippConnector;
