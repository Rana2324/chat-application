<script setup>
import { io } from "socket.io-client";
import { v4 as uuid } from "uuid";
import { computed, onMounted, ref, watch } from "vue";
import { getItem, setItem } from "../utilities";

const contacts = ref([]);
const messages = ref([]);
const openContact = ref(null);

const fullName = ref("");
const text = ref("");
const profileUrl = ref("");
const myProfile = ref(null);

const socket = io("ws://localhost:7070");

onMounted(() => {
  // get data from local store

  contacts.value = JSON.parse(getItem("contacts")) || [];
  myProfile.value = JSON.parse(getItem("myProfile")) || null;
  messages.value = JSON.parse(getItem("messages")) || [];

  // join user
  socket.on("user-joined", (data) => {
    const localContacts = JSON.parse(getItem("contacts")) || [];
    const localProfile = JSON.parse(getItem("myProfile")) || null;

    const isExist = localContacts.findIndex(
      (contact) => data.id === contact.id
    );

    if (data.id === localProfile?.id) return;

    if (isExist !== -1) return;

    contacts.value.push(data);
    setItem("contacts", JSON.stringify(contacts.value));

    if (myProfile.value) {
      socket.emit("join-user", myProfile.value);
    }
  });

  // socket.emit("notify-user-for-joining", myProfile.value);
  if (myProfile.value) {
    socket.emit("join-user", myProfile.value);
  }

  // received message
  socket.on("receivedNewMsg", (msg) => {
    messages.value = [...messages.value, msg];

    const newContacts = contacts.value.map((contact) => {
      if (contact.id === msg.senderId) {
        return {
          ...contact,
          lastMassage: msg.text,
          updatedAt: new Date(),
        };
      } else {
        return contact;
      }
    });

    contacts.value = newContacts;
  });
});

// create a profile
const createProfile = (e) => {
  const profile = {
    id: uuid(),
    fullName: fullName.value,
    profileUrl: profileUrl.value,
    lastMassage: "",
    updatedAt: new Date(),
  };

  myProfile.value = profile;
  setItem("myProfile", JSON.stringify(profile));

  if (myProfile.value) {
    socket.emit("join-user", myProfile.value);
  }
};

// messages
const populatedMessages = computed(() => {
  const data = messages.value.filter((msg) => {
    if (
      msg.senderId === openContact.value?.id ||
      msg.receiverId === openContact.value?.id
    ) {
      return true;
    } else {
      return false;
    }
  });

  return data;
});

// contacts
const sortedContacts = computed(() => {
  const data = contacts.value.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return data;
});

// watch state change
watch(
  messages,
  (newValue) => {
    setItem("messages", JSON.stringify(newValue));
  },
  {
    deep: true,
  }
);

watch(
  contacts,
  (newValue) => {
    setItem("contacts", JSON.stringify(newValue));
  },
  {
    deep: true,
  }
);

// send message
function sendMessage() {
  const msg = {
    id: uuid(),
    text: text.value,
    senderId: myProfile.value.id,
    receiverId: openContact.value.id,
    createdAt: new Date(),
  };

  text.value = "";
  messages.value = [...messages.value, msg];

  const newContacts = contacts.value.map((contact) => {
    if (contact.id === msg.receiverId) {
      return {
        ...contact,
        lastMassage: msg.text,
        updatedAt: new Date(),
      };
    } else {
      return contact;
    }
  });

  contacts.value = newContacts;

  socket.emit("newMessage", msg);
}

// Open chat
function openChat(id) {
  openContact.value = contacts.value.find((contact) => contact.id === id);
}
</script>

<template>
  <main>
    <div v-if="myProfile" class="container">
      <div class="inner_main">
        <aside class="contact_section">
          <header>
            <div class="profile">
              <img :src="myProfile.profileUrl" alt="profile" />
            </div>
          </header>
          <div class="contact_display">
            <div
              v-for="contact in sortedContacts"
              :key="contact.id"
              class="contact_card"
              @click="() => openChat(contact.id)"
            >
              <div class="profile">
                <img :src="contact.profileUrl" alt="profile" />
              </div>
              <div class="card_info">
                <h4 class="display_name">{{ contact.fullName }}</h4>
                <p class="last_message">
                  {{ contact.lastMassage || "New Chat" }}
                </p>
              </div>
              <div class="time">
                <span>
                  {{ new Date(contact.updatedAt).toLocaleTimeString() }}</span
                >
              </div>
            </div>
          </div>
        </aside>
        <div class="message_section">
          <header class="message_header">
            <div v-if="openContact">
              <div class="profile">
                <img :src="openContact.profileUrl" alt="profile" />
              </div>
              <div class="card_info">
                <h4 class="display_name">{{ openContact.fullName }}</h4>
              </div>
            </div>
          </header>
          <div v-if="openContact instanceof Object" class="message_display">
            <div v-if="populatedMessages.length" class="message_container">
              <div
                v-for="msg in populatedMessages"
                :key="msg.id"
                :class="`message ${
                  myProfile.id !== msg.senderId ? 'other' : 'self'
                }`"
              >
                <p class="text">
                  {{ msg.text }}
                </p>
                <div class="time">
                  {{ new Date(msg.createdAt).toLocaleTimeString() }}
                </div>
              </div>
            </div>
            <div v-else class="no-msg">
              <h2>No Message</h2>
            </div>
            <div class="message_form">
              <form @submit.prevent="sendMessage">
                <input
                  type="text"
                  placeholder="Type your text..."
                  name="message"
                  v-model="text"
                />
              </form>
            </div>
          </div>
          <div v-else class="no_contact_selected">
            <h2>No contact selected!</h2>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="modal_popup">
      <div class="header">
        <p>Create Your Profile</p>
        <button>
          <span class="material-symbols-outlined"> close </span>
        </button>
      </div>

      <div class="body">
        <form @submit.prevent="createProfile">
          <div class="form_item">
            <label for="fullName"> Your Full Name: </label>
            <br />
            <input
              required
              v-model="fullName"
              type="text"
              placeholder="Full Name"
              name="fullName"
              id="fullName"
            />
          </div>

          <div class="form_item">
            <label for="profileImgUrl"> Your Profile Image Url: </label>
            <br />
            <input
              required
              type="url"
              v-model="profileUrl"
              name="profileImgUrl"
              id="profileIMgUrl"
              placeholder="Profile image url"
            />
          </div>

          <div class="form_item">
            <input type="submit" value="Create" />
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
