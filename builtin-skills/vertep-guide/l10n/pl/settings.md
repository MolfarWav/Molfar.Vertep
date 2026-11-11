<!-- source: 6d6849f7892f -->
# Mapa Ustawień

Ustawienia to własne okno powłoki, wspólne dla wszystkich aplikacji. Otwórz je kołem zębatym na górnym pasku, a na telefonie z menu konta w prawym górnym rogu. Ta strona wymienia każdą sekcję, żebyś wiedział, gdzie szukać.

## Sekcje

- **Ogólne.** Język interfejsu, blok „Przewodnik” (wyłącz wycieczki, odtwórz je ponownie, pokaż ponownie „Co nowego”) i Twoje konto: zdjęcie, nazwa, hasło, „Wyloguj”.
- **Kopia zapasowa.** Eksportuj cały profil, aby przenieść się na inny komputer, i importuj taki profil. Zobacz [[devices]].
- **Pamięć.** Obrazy, których używają Twoje karty, czaty i sprite'y. „Znajdź nieużywane obrazy” lokalizuje te, których nic nie używa, i przenosi je do kosza; „Opróżnij kosz” usuwa je na stałe, po pytaniu.
- **Synchronizacja.** Przenoś swoje gry między urządzeniami przez Google Drive lub folder. Zobacz [[devices]].
- **Połączenia i modele.** Dostawcy, lista modeli, ulubione, ustawienia poszczególnych modeli, model wizyjny. Zobacz [[models]].
- **Mowa.** Synteza mowy: głosy Edge i Twoje własne endpointy mowy.
- **Obrazy.** Generowanie obrazów: modele obrazów i serwery obrazów.
- **Molfar.** Jak Molfar się zachowuje, w każdej aplikacji:
  - jego dostęp do internetu w piaskownicy;
  - „Automatycznie kompaktuj długie sesje”;
  - „Tryb małego modelu”;
  - „Kontrola kosztów”: Auto, Zawsze pytaj lub Nigdy nie pytaj;
  - „Powiadomienia”, gdy o coś pyta, kończy lub zawodzi;
  - „Instrukcje Molfara”, Twoje stałe preferencje dla niego;
  - lista chronionych plików.
  Zobacz [[molfar]].
- **Pamięć.** Jak aplikacje pamiętają i odnajdują rzeczy między czatami. Mogą dopasowywać według znaczenia, nie tylko dokładnych słów, jednym tanim modelem embeddingowym. To opcjonalne. Domyślnie Molfar Vertep sam wybiera model: najpierw ten na twoim komputerze (LM Studio, Ollama, bez klucza), potem połączenie API z kluczem, a na końcu OpenRouter. Jeśli nic nie jest skonfigurowane, pamięć to mówi i dopasowuje tylko po słowach. Model możesz też pobrać na swój komputer jednym kliknięciem: w **Na tym komputerze (opcjonalnie)** wybierz **bge-m3** (zalecany, najlepszy dla ukraińskiego, rosyjskiego i angielskiego) albo **EmbeddingGemma 2** (mniejszy) i naciśnij **Pobierz i połącz**. Silnik najpierw instaluje program uruchamiający model (około 85 MB, jednorazowo), potem pobiera model (587 MB albo 346 MB) i go łączy. Pobieranie trwa dalej, gdy zamkniesz okno, a przerwane wznawia się od miejsca, w którym stanęło. Potem jest darmowe, nic nie trafia do internetu, a model zajmuje pamięć (około 1,1 GB albo 0,6 GB) tylko podczas pracy. **Usuń** zwraca miejsce na dysku. Potrzebny jest komputer, na którym silnik działa z Bunem, a nie launcher na telefonie; połączenie online zostaje jako zapas, a jeśli zmienisz model, pamięć sama tworzy wektory od nowa. Wektory zostają na urządzeniu, które je utworzyło, i nie są synchronizowane, więc komputer i telefon dzielące jedną przestrzeń roboczą mogą używać różnych modeli, a każde tworzy własne. Model, który jest taki sam pod dwiema nazwami (bge-m3 na tym komputerze i przez OpenRouter), zachowuje swoje wektory, gdy przełączasz się między nimi.
- **Serwery MCP.** Serwery narzędzi, które Molfar i Twoje aplikacje mogą wywoływać. Aplikacje zaczynają z każdym wyłączonym i włączają to, czego potrzebują.
- **Programista.** Pokazuje stan budowania każdej aplikacji i przeładowanie na żywo, które jest zawsze włączone.

## Tylko dla administratora

- **Serwer.** Jak Molfar Vertep działa na tym komputerze: port, otwieranie przeglądarki przy starcie, zezwalanie innym urządzeniom w Twojej sieci (z kodem QR dla telefonu), HTTPS, czy aplikacje mogą pobierać pakiety, wersja i sposób aktualizacji.
- **Użytkownicy.** Osoby, które mogą się logować. Każda dostaje własną przestrzeń roboczą, agenta i aplikacje.

## Ustawienia aplikacji

Na górze listy grupa **Ustawienia aplikacji** wymienia każdą zainstalowaną aplikację, która ma własną stronę ustawień (Roleplay, tam pokazywany jako „Vertep”, oraz Social). Dotknij jednej: Ustawienia się zamkną, a aplikacja otworzy się na swojej stronie ustawień. W Roleplay to wygląd czatu, „Chat Behavior” (sprawdzanie pisowni, autokorekta), strumieniowanie, motywy i reszta ustawień czatu. Aplikacja bez strony ustawień nie jest na liście. Ta sama strona jest też wewnątrz aplikacji: zobacz [[apps]].

> Na telefonie Ustawienia najpierw pokazują listę sekcji; dotknij jedną, aby wejść, i użyj Wstecz, aby wrócić.
