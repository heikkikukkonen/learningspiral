alter table public.user_settings
  alter column discuss_card_generation_prompt set default '';

update public.user_settings
set discuss_card_generation_prompt = ''
where discuss_card_generation_prompt in (
  'Luo tehtava joka kannustaa minua loytamaan jonkun ystavan tai asiantuntijan kenen kanssa voisin keskustella aiheesta syventaakseni ymmarrysta asiasta.',
  'Luo tehtava joka kannustaa minua loytamaan jonkun ystavan tai asiantuntijan kenen kanssa voisin keskustella aiheesta syventaakseni ymmarrysta asista.'
);
