const querystring = require("querystring");
const axios = require("axios").default;

class KlicktippConnector {
  constructor(service = "https://api.klicktipp.com") {
    this.baseURL = service;
    this.sessionName = "";
    this.sessionId = "";
    this.error = "";
  }

  /**
   * Get last error
   *
   * @return string an error description of the last error
   */
  getLastError = () => {
    const result = this.error;
    this.error = "";
    return result;
  };

  /**
   * login
   *
   * @param username The login name of the user to login.
   * @param password The password of the user.
   * @return TRUE on success
   */
  login = async (username, password) => {
    if (!(username && password)) {
      throw 'Login failed: Illegal Arguments';
    }
    
    const res = await this.httpRequest(
      "/account/login",
      "POST",
      { username, password },
      false,
    );

    if (!res.isAxiosError) {
      this.sessionId = res.data.sessid;
      this.sessionName = res.data.session_name;
      return true;
    }

    throw `Login failed: ${res.response.statusText}`;
  };

  /**
   * Logs out the user currently logged in.
   *
   * @return TRUE on success
   */
  logout = async () => {
    const res = await this.httpRequest("/account/logout", "POST");
    if (!res.isAxiosError) {
      this.sessionId = "";
      this.sessionName = "";
      return true;
    }

    this.error = `Logout failed: ${res.response.statusText}`;
    return false;
  };

  /**
   * Get all subscription processes (lists) of the logged in user. Requires to be logged in.
   *
   * @return A associative obeject <list id> => <list name>
   */
  subscriptionProcessIndex = async () => {
    const res = await this.httpRequest("/list");

    if (!res.isAxiosError) {
      return res.data;
    }

    this.error = `Subscription process index failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // retrieve
    const res = await this.httpRequest(`/subscriber/${listid}`);

    if (!res.isAxiosError) {
      return res.data;
    }

    this.error = `Subscription process get failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // update
    const data = { listid, email };
    const res = await this.httpRequest("/list/redirect", "POST", data);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Subscription process get redirection url failed: ${res.response.statusText}`;
    return false;
  };
  /**
   * Get all manual tags of the logged in user. Requires to be logged in.
   *
   * @return A associative object <tag id> => <tag name>
   */
  tagIndex = async () => {
    const res = await this.httpRequest("/tag");
    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Tag index failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }
    const res = await this.httpRequest(`/tag/${tagid}`);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Tag get failed: ${res.response.statusText}`;
    return false;
  };

  /**
   * Create a new manual tag. Requires to be logged in.
   *
   * @param name The name of the tag.
   * @param text (optional) An additional description of the tag.
   *
   * @return The id of the newly created tag or false if failed.
   */
  tagCreate = async (name, text = "") => {
    if (!name || name === "") {
      this.error = "Illegal Arguments";
      return false;
    }
    const data = { name };
    if (text !== "") {
      data.text = text;
    }
    const res = await this.httpRequest("/tag", "POST", data);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Tag creation failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }
    const data = {};
    if (name !== "") {
      data.name = name;
    }
    if (text !== "") {
      data.text = text;
    }

    const res = await this.httpRequest(`/tag/${tagid}`, "PUT", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Tag update failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    const res = await this.httpRequest(`/tag/${tagid}`, "DELETE");

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Tag deletion failed: ${res.response.statusText}`;
    return false;
  };

  /**
   * Get all contact fields of the logged in user. Requires to be logged in.
   *
   * @return A associative object <field id> => <field name>
   */
  fieldIndex = async () => {
    const res = await this.httpRequest("/field");

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Field index failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
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

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Subscription failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // unsubscribe;
    const data = { email };

    const res = await this.httpRequest("/subscriber/unsubscribe", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Unsubscription failed:  ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // tag
    const data = {
      email,
      tagids,
    };

    const res = await this.httpRequest("/subscriber/tag", "POST", data);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Tagging failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // subscribe
    const data = {
      email,
      tagid,
    };

    const res = await this.httpRequest("/subscriber/untag", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Untagging failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // resend/reset autoresponder
    const data = { email, autoresponder };

    const res = await this.httpRequest("/subscriber/resend", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Resend failed: ${res.response.statusText}`;
    return false;
  };

  /**
   * Get all active subscribers. Requires to be logged in.
   *
   * @return An array of subscriber ids.
   */
  subscriberIndex = async () => {
    const res = await this.httpRequest("/subscriber");

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Subscriber index failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // retrieve
    const res = await this.httpRequest(`/subscriber/${subscriberid}`);
    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Subscriber get failed:  ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }
    // search
    const data = { email };
    const res = await this.httpRequest("/subscriber/search", "POST", data);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `Subscriber search failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // search
    const data = { tagid };
    const res = await this.httpRequest("/subscriber/tagged", "POST", data);

    if (!res.isAxiosError) {
      return res.data;
    }
    this.error = `subscriber tagged failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
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
    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Subscriber update failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // delete
    const res = await this.httpRequest(`/subscriber/${subscriberid}`, "DELETE");

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Subscriber deletion failed: ${res.response.statusText}`;
    return false;
  };
  /**
   * Subscribe an email. Requires an api key.
   *
   * @param apikey The api key (listbuildng configuration).
   * @param email The email address of the subscriber.
   * @param fields (optional) Additional fields of the subscriber.
   *
   * @return A redirection url as defined in the subscription process.
   */
  signin = async (apikey, email, fields = {}, smsnumber = "") => {
    if (
      !apikey ||
      apikey === "" ||
      ((!email || email === "") && smsnumber === "")
    ) {
      this.error = "Illegal Arguments";
      return false;
    }

    // subscribe
    const data = { apikey, email, fields };

    if (smsnumber !== "") {
      data.smsnumber = smsnumber;
    }
    const res = await this.httpRequest("/subscriber/signin", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Subscription failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // untag
    const data = { apikey, email };
    const res = await this.httpRequest("/subscriber/signout", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Untagging failed: ${res.response.statusText}`;
    return false;
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
      this.error = "Illegal Arguments";
      return false;
    }

    // unsubscribe
    const data = { apikey, email };
    const res = await this.httpRequest("/subscriber/signoff", "POST", data);

    if (!res.isAxiosError) {
      return true;
    }
    this.error = `Unsubscription failed: ${res.response.statusText}`;
    return false;
  };

  httpRequest = async (path, method = "GET", data, usesession = true) => {
    const options = {
      baseURL: this.baseURL,
      method,
      url: path,
      data,
      headers: {
        "Content-Type": "application/json",
        "Content": "application/json"
      },
    };
    if (usesession && this.sessionName !== "") {
      options.headers["Cookie"] = `${this.sessionName}=${this.sessionId}`;
    }

    return axios(options)
      .then((res) => res)
      .catch((error) => error);
  };
}

module.exports = KlicktippConnector;
