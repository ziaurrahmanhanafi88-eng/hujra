/* =========================================================
   H U J R A | Supabase Version
   Shared posts + likes + profile + edit posts
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://bfrluzhuxxsudfcybwks.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_PewlmDXruPH-aT49y8UP_A_sGp39TND";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   LOCAL LOGIN
   ========================================================= */

const LS_USERS = "hujra_users";
const LS_SESSION = "hujra_session";


function $(id) {
  return document.getElementById(id);
}


function getUsers() {
  try {
    return JSON.parse(
      localStorage.getItem(LS_USERS) || "[]"
    );
  } catch (e) {
    console.error("Users error:", e);
    return [];
  }
}


function saveUsers(users) {
  localStorage.setItem(
    LS_USERS,
    JSON.stringify(users)
  );
}


function getSession() {
  return localStorage.getItem(LS_SESSION);
}


function setSession(email) {
  localStorage.setItem(
    LS_SESSION,
    email
  );
}


function clearSession() {
  localStorage.removeItem(
    LS_SESSION
  );
}


function findUser(email) {

  if (!email) {
    return null;
  }

  return getUsers().find(
    user =>
      user.email &&
      user.email.toLowerCase() ===
      email.toLowerCase()
  );
}


/* =========================================================
   HELPERS
   ========================================================= */

function initials(name) {

  return (name || "?")
    .trim()
    .slice(0, 1)
    .toUpperCase();

}


function timeAgo(dateValue) {

  const timestamp =
    new Date(dateValue).getTime();

  if (!timestamp) {
    return "";
  }

  const diff =
    Math.floor(
      (Date.now() - timestamp) / 1000
    );

  if (diff < 60) {
    return "همدا اوس";
  }

  if (diff < 3600) {

    return `${Math.floor(
      diff / 60
    )} دقیقې مخکې`;

  }

  if (diff < 86400) {

    return `${Math.floor(
      diff / 3600
    )} ساعته مخکې`;

  }

  return `${Math.floor(
    diff / 86400
  )} ورځې مخکې`;

}


function escapeHtml(str) {

  const div =
    document.createElement("div");

  div.textContent = str || "";

  return div.innerHTML;

}


/* =========================================================
   VIEW SWITCHING
   ========================================================= */

function showAuth() {

  $("authView")
    .classList
    .remove("hidden");

  $("feedView")
    .classList
    .add("hidden");

  $("profileView")
    .classList
    .add("hidden");

}


function showFeed() {

  $("authView")
    .classList
    .add("hidden");

  $("feedView")
    .classList
    .remove("hidden");

  $("profileView")
    .classList
    .add("hidden");

  renderFeed();

}


function showProfile() {

  $("authView")
    .classList
    .add("hidden");

  $("feedView")
    .classList
    .add("hidden");

  $("profileView")
    .classList
    .remove("hidden");

  renderProfile();

}


/* =========================================================
   AUTH TABS
   ========================================================= */

document
  .querySelectorAll(".tab-btn")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab-btn")
          .forEach(b =>
            b.classList.remove(
              "active"
            )
          );

        document
          .querySelectorAll(".auth-form")
          .forEach(form =>
            form.classList.remove(
              "active"
            )
          );

        btn.classList.add("active");

        const form =
          $(btn.dataset.tab + "Form");

        if (form) {
          form.classList.add(
            "active"
          );
        }

      }
    );

  });


/* =========================================================
   SIGN UP
   ========================================================= */

$("signupForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const name =
        $("signupName")
          .value
          .trim();

      const email =
        $("signupEmail")
          .value
          .trim()
          .toLowerCase();

      const password =
        $("signupPassword")
          .value;

      const errorEl =
        $("signupError");

      errorEl.textContent = "";

      if (!name || !email || !password) {

        errorEl.textContent =
          "مهرباني وکړئ ټول معلومات ولیکئ.";

        return;
      }

      if (password.length < 4) {

        errorEl.textContent =
          "پټنوم باید لږ تر لږه ۴ توري ولري.";

        return;
      }

      if (findUser(email)) {

        errorEl.textContent =
          "دا بریښنالیک مخکې ثبت شوی. ننوتل وکړئ.";

        return;
      }


      /* Create local account */

      const users =
        getUsers();

      const user = {

        name: name,

        email: email,

        password: password,

        provider: "local"

      };

      users.push(user);

      saveUsers(users);


      /* Create Supabase profile */

      const {
        error
      } = await db
        .from("profiles")
        .upsert(
          {
            name: name,
            email: email
          },
          {
            onConflict: "email"
          }
        );


      if (error) {

        console.error(
          "Profile error:",
          error
        );

        /*
          Account is still saved locally.
          Do not destroy the login.
        */

        setSession(email);

        boot();

        return;
      }


      setSession(email);

      boot();

    }
  );


/* =========================================================
   LOGIN
   ========================================================= */

$("loginForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const email =
        $("loginEmail")
          .value
          .trim()
          .toLowerCase();

      const password =
        $("loginPassword")
          .value;

      const errorEl =
        $("loginError");

      errorEl.textContent = "";


      const user =
        findUser(email);


      if (
        !user ||
        user.password !== password
      ) {

        errorEl.textContent =
          "بریښنالیک یا پټنوم سم نه دی.";

        return;
      }


      /*
        Login does NOT depend on Supabase.
        This prevents Supabase errors
        from blocking local login.
      */

      try {

        await db
          .from("profiles")
          .upsert(
            {
              name: user.name,
              email: user.email
            },
            {
              onConflict: "email"
            }
          );

      } catch (error) {

        console.error(
          "Profile sync error:",
          error
        );

      }


      setSession(
        user.email
      );

      boot();

    }
  );


/* =========================================================
   LOGOUT
   ========================================================= */

function doLogout() {

  clearSession();

  showAuth();

}


$("logoutBtn")
  .addEventListener(
    "click",
    doLogout
  );


$("logoutBtn2")
  .addEventListener(
    "click",
    doLogout
  );


/* =========================================================
   NAVIGATION
   ========================================================= */

$("navFeedBtn")
  .addEventListener(
    "click",
    showFeed
  );


$("navProfileBtn")
  .addEventListener(
    "click",
    showProfile
  );


$("navFeedBtn2")
  .addEventListener(
    "click",
    showFeed
  );


$("navProfileBtn2")
  .addEventListener(
    "click",
    showProfile
  );


/* =========================================================
   EDIT PROFILE
   ========================================================= */

async function editProfile() {

  const email =
    getSession();

  if (!email) {
    return;
  }


  const {
    data: profile,
    error
  } = await db
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();


  if (error) {

    console.error(
      "Profile loading error:",
      error
    );

  }


  const name =
    prompt(
      "نوم:",
      profile?.name || ""
    );

  if (name === null) {
    return;
  }


  const username =
    prompt(
      "Username (لکه zia_hanafi):",
      profile?.username || ""
    );

  if (username === null) {
    return;
  }


  const bio =
    prompt(
      "Bio / لنډه پېژندنه:",
      profile?.bio || ""
    );

  if (bio === null) {
    return;
  }


  const location =
    prompt(
      "Location / ځای:",
      profile?.location || ""
    );

  if (location === null) {
    return;
  }


  const profession =
    prompt(
      "Profession / دنده:",
      profile?.profession || ""
    );

  if (profession === null) {
    return;
  }


  const education =
    prompt(
      "Education / زده کړې:",
      profile?.education || ""
    );

  if (education === null) {
    return;
  }


  const skills =
    prompt(
      "Skills / مهارتونه:",
      profile?.skills || ""
    );

  if (skills === null) {
    return;
  }


  const interests =
    prompt(
      "Interests / علاقې:",
      profile?.interests || ""
    );

  if (interests === null) {
    return;
  }


  const website =
    prompt(
      "Website:",
      profile?.website || ""
    );

  if (website === null) {
    return;
  }


  const {
    error: saveError
  } = await db
    .from("profiles")
    .update({

      name:
        name.trim(),

      username:
        username
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            "_"
          ),

      bio:
        bio.trim(),

      location:
        location.trim(),

      profession:
        profession.trim(),

      education:
        education.trim(),

      skills:
        skills.trim(),

      interests:
        interests.trim(),

      website:
        website.trim(),

      updated_at:
        new Date().toISOString()

    })
    .eq(
      "email",
      email
    );


  if (saveError) {

    console.error(
      "Profile save error:",
      saveError
    );

    alert(
      "پروفایل Save نه شو.\n\n" +
      saveError.message
    );

    return;
  }


  /* Update local name */

  const users =
    getUsers();

  const index =
    users.findIndex(
      u =>
        u.email &&
        u.email.toLowerCase() ===
        email.toLowerCase()
    );


  if (index !== -1) {

    users[index].name =
      name.trim();

    saveUsers(users);

  }


  alert(
    "پروفایل په بریالیتوب سره Save شو."
  );


  await renderProfile();

}


/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

function decodeJwt(token) {

  try {

    const payload =
      token.split(".")[1];

    const json =
      decodeURIComponent(
        atob(
          payload
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
          .split("")
          .map(
            c =>
              "%" +
              (
                "00" +
                c
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2)
          )
          .join("")
      );

    return JSON.parse(json);

  } catch (e) {

    console.error(
      "JWT error:",
      e
    );

    return null;

  }

}


window.handleGoogleCredential =
  async function(response) {

    const data =
      decodeJwt(
        response.credential
      );

    if (
      !data ||
      !data.email
    ) {
      return;
    }


    const email =
      data.email.toLowerCase();


    let user =
      findUser(email);


    if (!user) {

      user = {

        name:
          data.name ||
          email.split("@")[0],

        email:
          email,

        password:
          null,

        provider:
          "google"

      };


      const users =
        getUsers();

      users.push(user);

      saveUsers(users);

    }


    try {

      await db
        .from("profiles")
        .upsert(
          {
            name: user.name,
            email: user.email
          },
          {
            onConflict: "email"
          }
        );

    } catch (error) {

      console.error(
        "Google profile error:",
        error
      );

    }


    setSession(
      user.email
    );

    boot();

  };


function initGoogleButton() {

  if (
    typeof GOOGLE_CLIENT_ID ===
      "undefined" ||
    !GOOGLE_CLIENT_ID ||
    typeof google ===
      "undefined"
  ) {
    return;
  }


  google.accounts.id.initialize({

    client_id:
      GOOGLE_CLIENT_ID,

    callback:
      window.handleGoogleCredential

  });


  google.accounts.id.renderButton(
    $("googleBtnHolder"),
    {
      theme:
        "filled_black",

      shape:
        "pill",

      text:
        "continue_with",

      locale:
        "en"
    }
  );

}


/* =========================================================
   IMAGE HANDLING
   ========================================================= */

let pendingImage = null;


$("imageInput")
  .addEventListener(
    "change",
    e => {

      const file =
        e.target.files[0];

      if (!file) {
        return;
      }


      if (
        file.size >
        8 * 1024 * 1024
      ) {

        alert(
          "عکس باید له ۸MB څخه کوچنی وي."
        );

        $("imageInput").value =
          "";

        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        ev => {

          const img =
            new Image();


          img.onload =
            () => {

              const maxW =
                900;


              const scale =
                Math.min(
                  1,
                  maxW /
                    img.width
                );


              const canvas =
                document.createElement(
                  "canvas"
                );


              canvas.width =
                Math.round(
                  img.width *
                    scale
                );


              canvas.height =
                Math.round(
                  img.height *
                    scale
                );


              const ctx =
                canvas.getContext(
                  "2d"
                );


              ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
              );


              pendingImage =
                canvas.toDataURL(
                  "image/jpeg",
                  0.72
                );


              $("imagePreview")
                .src =
                pendingImage;


              $("imagePreviewWrap")
                .classList
                .remove(
                  "hidden"
                );

            };


          img.src =
            ev.target.result;

        };


      reader.readAsDataURL(
        file
      );

    }
  );


/* =========================================================
   REMOVE IMAGE
   ========================================================= */

$("removeImageBtn")
  .addEventListener(
    "click",
    () => {

      pendingImage =
        null;

      $("imageInput").value =
        "";

      $("imagePreviewWrap")
        .classList
        .add("hidden");

    }
  );


/* =========================================================
   GET POSTS
   ========================================================= */

async function getPosts() {

  const {
    data,
    error
  } = await db
    .from("posts")
    .select("*")
    .order(
      "created_at",
      {
        ascending:
          false
      }
    );


  if (error) {

    console.error(
      "Posts loading error:",
      error
    );

    return [];

  }


  const postIds =
    (data || []).map(
      post =>
        post.id
    );


  if (
    postIds.length ===
    0
  ) {
    return [];
  }


  const {
    data: likes,
    error: likesError
  } = await db
    .from("post_likes")
    .select(
      "post_id,email"
    )
    .in(
      "post_id",
      postIds
    );


  if (likesError) {

    console.error(
      "Likes loading error:",
      likesError
    );

  }


  const likesList =
    likes || [];


  return (
    data || []
  ).map(
    post => {

      const postLikes =
        likesList
          .filter(
            like =>
              like.post_id ===
              post.id
          )
          .map(
            like =>
              like.email
          );


      return {

        id:
          post.id,

        email:
          post.email,

        name:
          post.name,

        text:
          post.text || "",

        image:
          post.image || null,

        likes:
          postLikes,

        createdAt:
          post.created_at

      };

    }
  );

}


/* =========================================================
   CREATE POST
   ========================================================= */

$("submitPostBtn")
  .addEventListener(
    "click",
    async () => {

      const text =
        $("postText")
          .value
          .trim();


      if (
        !text &&
        !pendingImage
      ) {
        return;
      }


      const email =
        getSession();


      const user =
        findUser(email);


      if (!user) {

        alert(
          "لومړی باید حساب ته داخل شئ."
        );

        return;
      }


      const button =
        $("submitPostBtn");


      button.disabled =
        true;

      button.textContent =
        "خپورېږي...";


      try {

        /*
          Make sure profile exists
        */

        const {
          data: profile,
          error:
            profileError
        } = await db
          .from("profiles")
          .upsert(
            {
              name:
                user.name,

              email:
                user.email
            },
            {
              onConflict:
                "email"
            }
          )
          .select()
          .single();


        if (profileError) {

          console.error(
            "Profile error:",
            profileError
          );

          /*
            Do not stop if profile
            synchronization fails.
          */

        }


        /*
          Create post
        */

        const {
          error
        } = await db
          .from("posts")
          .insert({

            profile_id:
              profile
                ? profile.id
                : null,

            name:
              user.name,

            email:
              user.email,

            text:
              text,

            image:
              pendingImage

          });


        if (error) {

          console.error(
            "Post error:",
            error
          );

          alert(
            "پوسټ خپور نه شو.\n\n" +
            error.message
          );

          return;
        }


        /*
          Clear composer
        */

        $("postText")
          .value =
          "";

        pendingImage =
          null;

        $("imageInput")
          .value =
          "";

        $("imagePreviewWrap")
          .classList
          .add(
            "hidden"
          );


        await renderFeed();

      } catch (error) {

        console.error(
          error
        );

        alert(
          "یوه ستونزه رامنځته شوه.\n\n" +
          error.message
        );

      } finally {

        button.disabled =
          false;

        button.textContent =
          "خپور کول";

      }

    }
  );


/* =========================================================
   POST CARD
   ========================================================= */

function postCardHtml(
  post,
  currentEmail
) {

  const liked =
    post.likes.includes(
      currentEmail
    );


  const isOwner =
    post.email &&
    currentEmail &&
    post.email.toLowerCase() ===
      currentEmail.toLowerCase();


  return `

    <article
      class="post-card"
      data-id="${post.id}"
    >

      <div class="post-head">

        <div class="avatar">
          ${escapeHtml(
            initials(post.name)
          )}
        </div>

        <div>

          <div class="post-author">
            ${escapeHtml(
              post.name
            )}
          </div>

          <div class="post-time">
            ${timeAgo(
              post.createdAt
            )}
          </div>

        </div>

      </div>


      ${
        post.text
          ? `
            <div class="post-text">
              ${escapeHtml(
                post.text
              )}
            </div>
          `
          : ""
      }


      ${
        post.image
          ? `
            <img
              class="post-image"
              src="${post.image}"
              alt="عکس"
              loading="lazy"
            >
          `
          : ""
      }


      <div class="post-foot">

        ${
          isOwner
            ? `
              <button
                class="edit-post-btn"
                data-id="${post.id}"
                type="button"
              >
                ✏️ سمول
              </button>
            `
            : ""
        }


        <button
          class="like-btn ${
            liked
              ? "liked"
              : ""
          }"
          data-id="${post.id}"
          type="button"
        >

          <span class="flame">
            🔥
          </span>

          <span class="like-count">
            ${post.likes.length}
          </span>

          <span>
            ${
              liked
                ? "خوښ شو"
                : "خوښول"
            }
          </span>

        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   EDIT POST HANDLERS
   ========================================================= */

function attachEditHandlers(
  container
) {

  container
    .querySelectorAll(
      ".edit-post-btn"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        async () => {

          const postId =
            btn.dataset.id;

          await editPost(
            postId
          );

        }
      );

    });

}


/* =========================================================
   EDIT POST
   ========================================================= */

async function editPost(
  postId
) {

  const email =
    getSession();


  if (!email) {

    alert(
      "لومړی Login وکړئ."
    );

    return;
  }


  /*
    Get current post
  */

  const {
    data: post,
    error:
      loadError
  } = await db
    .from("posts")
    .select("*")
    .eq(
      "id",
      postId
    )
    .maybeSingle();


  if (loadError) {

    console.error(
      "Post loading error:",
      loadError
    );

    alert(
      "پوسټ ونه لوستل شو.\n\n" +
      loadError.message
    );

    return;
  }


  if (!post) {

    alert(
      "پوسټ پیدا نه شو."
    );

    return;
  }


  /*
    Only owner can edit
  */

  if (
    !post.email ||
    post.email.toLowerCase() !==
      email.toLowerCase()
  ) {

    alert(
      "تاسو د دې پوسټ د Edit اجازه نه لرئ."
    );

    return;
  }


  /*
    New text
  */

  const newText =
    prompt(
      "د پوسټ نوی متن ولیکئ:",
      post.text || ""
    );


  if (
    newText ===
    null
  ) {
    return;
  }


  const cleanText =
    newText.trim();


  if (
    !cleanText &&
    !post.image
  ) {

    alert(
      "پوسټ تش نه شي پاتې کېدای."
    );

    return;
  }


  /*
    Update Supabase
  */

  const {
    error:
      updateError
  } = await db
    .from("posts")
    .update({

      text:
        cleanText,

      updated_at:
        new Date().toISOString()

    })
    .eq(
      "id",
      postId
    )
    .eq(
      "email",
      email
    );


  if (updateError) {

    console.error(
      "Post update error:",
      updateError
    );

    alert(
      "پوسټ Save نه شو.\n\n" +
      updateError.message
    );

    return;
  }


  alert(
    "پوسټ په بریالیتوب سره Save شو."
  );


  await renderFeed();


  if (
    !$("profileView")
      .classList
      .contains(
        "hidden"
      )
  ) {

    await renderProfile();

  }

}


/* =========================================================
   LIKE
   ========================================================= */

function attachLikeHandlers(
  container
) {

  container
    .querySelectorAll(
      ".like-btn"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        async () => {

          const postId =
            btn.dataset.id;


          const email =
            getSession();


          if (!email) {
            return;
          }


          btn.disabled =
            true;


          try {

            const {
              data: existing,
              error:
                checkError
            } = await db
              .from("post_likes")
              .select("id")
              .eq(
                "post_id",
                postId
              )
              .eq(
                "email",
                email
              )
              .maybeSingle();


            if (checkError) {

              console.error(
                checkError
              );

              return;
            }


            if (existing) {

              /*
                Remove like
              */

              const {
                error
              } = await db
                .from(
                  "post_likes"
                )
                .delete()
                .eq(
                  "id",
                  existing.id
                );


              if (error) {

                console.error(
                  "Unlike error:",
                  error
                );

                return;
              }

            } else {

              /*
                Add like
              */

              const {
                error
              } = await db
                .from(
                  "post_likes"
                )
                .insert({

                  post_id:
                    postId,

                  email:
                    email

                });


              if (error) {

                console.error(
                  "Like error:",
                  error
                );

                return;
              }

            }


            await renderFeed();


            if (
              !$("profileView")
                .classList
                .contains(
                  "hidden"
                )
            ) {

              await renderProfile();

            }

          } finally {

            btn.disabled =
              false;

          }

        }
      );

    });

}


/* =========================================================
   RENDER FEED
   ========================================================= */

async function renderFeed() {

  const email =
    getSession();


  const user =
    findUser(email);


  if (!user) {

    showAuth();

    return;
  }


  $("topUserName")
    .textContent =
    user.name;


  $("composerAvatar")
    .textContent =
    initials(
      user.name
    );


  const listEl =
    $("feedList");


  listEl.innerHTML =
    `<p class="empty-msg">
      پوسټونه لوډ کېږي...
    </p>`;


  const posts =
    await getPosts();


  if (
    posts.length ===
    0
  ) {

    listEl.innerHTML =
      "";

  } else {

    listEl.innerHTML =
      posts
        .map(
          post =>
            postCardHtml(
              post,
              email
            )
        )
        .join("");

  }


  $("emptyFeedMsg")
    .classList
    .toggle(
      "hidden",
      posts.length > 0
    );


  attachLikeHandlers(
    listEl
  );


  attachEditHandlers(
    listEl
  );

}


/* =========================================================
   RENDER PROFILE
   ========================================================= */

async function renderProfile() {

  const email =
    getSession();


  const user =
    findUser(email);


  if (!user) {

    showAuth();

    return;
  }


  const {
    data: profile,
    error
  } = await db
    .from("profiles")
    .select("*")
    .eq(
      "email",
      email
    )
    .maybeSingle();


  if (error) {

    console.error(
      "Profile loading error:",
      error
    );

  }


  const profileData =
    profile || {

      name:
        user.name,

      email:
        user.email

    };


  $("topUserName2")
    .textContent =
    profileData.name ||
    user.name;


  $("profileAvatar")
    .textContent =
    initials(
      profileData.name ||
      user.name
    );


  $("profileName")
    .textContent =
    profileData.name ||
    user.name;


  $("profileEmail")
    .textContent =
    profileData.email ||
    user.email;


  $("profileUsername")
    .textContent =
    profileData.username
      ? "@" +
        profileData.username
      : "";


  $("profileBio")
    .textContent =
    profileData.bio ||
    "";


  $("profileLocation")
    .textContent =
    profileData.location ||
    "";


  $("profileProfession")
    .textContent =
    profileData.profession ||
    "";


  $("profileEducation")
    .textContent =
    profileData.education ||
    "";


  $("profileSkills")
    .textContent =
    profileData.skills ||
    "";


  $("profileInterests")
    .textContent =
    profileData.interests ||
    "";


  $("profileWebsite")
    .textContent =
    profileData.website ||
    "";


  /*
    User posts
  */

  const listEl =
    $("profileList");


  listEl.innerHTML =
    `<p class="empty-msg">
      پوسټونه لوډ کېږي...
    </p>`;


  const allPosts =
    await getPosts();


  const posts =
    allPosts.filter(
      post =>
        post.email &&
        post.email.toLowerCase() ===
        email.toLowerCase()
    );


  if (
    posts.length ===
    0
  ) {

    listEl.innerHTML =
      "";

  } else {

    listEl.innerHTML =
      posts
        .map(
          post =>
            postCardHtml(
              post,
              email
            )
        )
        .join("");

  }


  $("emptyProfileMsg")
    .classList
    .toggle(
      "hidden",
      posts.length > 0
    );


  attachLikeHandlers(
    listEl
  );


  attachEditHandlers(
    listEl
  );

}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

let refreshTimer =
  null;


function startAutoRefresh() {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    );

  }


  refreshTimer =
    setInterval(
      async () => {

        const feedVisible =
          !$("feedView")
            .classList
            .contains(
              "hidden"
            );


        if (
          feedVisible
        ) {

          await renderFeed();

        }

      },
      10000
    );

}


/* =========================================================
   BOOT
   ========================================================= */

function boot() {

  const email =
    getSession();


  const user =
    findUser(email);


  if (
    email &&
    user
  ) {

    showFeed();

  } else {

    clearSession();

    showAuth();

  }

}


/* =========================================================
   START APP
   ========================================================= */

initGoogleButton();

startAutoRefresh();

boot();
