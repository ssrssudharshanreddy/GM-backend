import { adminClient } from './src/config/supabase.js';

async function test() {
  const { data, error } = await adminClient.auth.signInWithPassword({
    email: 'ceo@gangamaxx.com',
    password: 'GangaMaxx@18' // assuming a standard password? or maybe I don't know it.
  });
  console.log(data);
}
test();
