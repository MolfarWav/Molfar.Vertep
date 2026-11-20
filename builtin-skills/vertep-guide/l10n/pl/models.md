<!-- source: cb493ace9db7 -->
# Modele i połączenia

Molfar i Twoje aplikacje potrzebują modelu AI, aby odpowiadać. Ta strona wyjaśnia, jak podłączyć model, wybrać, które modele się pokazują, oraz skonfigurować obrazy i mowę. To wszystko znajduje się w Ustawieniach.

## Połączenia

Połączenie to zapisany link do dostawcy lub serwera. Otwórz Ustawienia, potem „Połączenia i modele”, potem „Dodaj połączenie”. Lista dostawców oferuje:

- Znanych dostawców: wybierz jednego i wklej jego klucz API.
- „Subskrypcje (OAuth)”: logujesz się zamiast wklejać klucz.
- „Model lokalny”: Ollama, LM Studio, llama.cpp i inne działające na Twoim komputerze.
- „Własny endpoint”: dowolny serwer mówiący jednym z obsługiwanych formatów, na przykład zgodny z OpenAI.

Połączenie brzmi „Połączono”, gdy ma klucz (albo go nie potrzebuje), a w przeciwnym razie „Wymagany klucz”. To nie jest test, czy model działa. Klucze są przechowywane tylko na tym komputerze.

## Wybieranie, które modele się pokazują

Jedno połączenie może przynieść setki modeli. Na liście pod połączeniami:

- Zaznacz modele, które mają pokazywać selektory. Jeśli nic nie jest zaznaczone, pokazują się wszystkie.
- Oznacz gwiazdką te, między którymi się przełączasz. Tworzą one „Szybkie przełączanie” i pojawiają się jako pierwsze w selektorach modeli, na czatach Molfara i w aplikacjach.
- Użyj ikony suwaków, aby otworzyć ustawienia własne modelu.

## Ustawienia poszczególnych modeli

Ustawienia modelu obejmują jego okno kontekstu, maks. tokenów wyjściowych, rozumowanie, ceny (w dolarach za milion tokenów), sprawdzenie pamięci podręcznej promptów, czas życia pamięci podręcznej oraz parametry próbkowania, takie jak kary i Min P. „Sprawdź pamięć podręczną” mówi, czy dostawca odczytuje powtórzony prompt ze swojej pamięci podręcznej, co jest tańsze i szybsze. Czas życia pamięci podręcznej ma trzy opcje: „Dostawcy” (zwykle około 5 minut, nic dodatkowego nie jest wysyłane), „Long” (prosi o godzinę w przypadku Claude i do jednego dnia w przypadku GPT; bez dodatkowych żądań, zapis pamięci podręcznej kosztuje więcej; oferowane tylko na połączeniach, które to respektują: sam Anthropic, Claude przez OpenRouter i OpenAI, a gdzie indziej wyszarzone, ponieważ brama może to zignorować lub odrzucić żądanie) oraz „Keep alive” (po odpowiedzi czatu silnik wysyła małe żądanie mniej więcej co 5 minut przez maksymalnie 40 minut, aby pamięć podręczna nie wygasła; kosztuje to około jednej dziesiątej ceny wejściowej promptu za każdym razem, wlicza się do limitów żądań i subskrypcji, wymaga ustawienia cen modelu i nie jest używane z narzędziami ani z myśleniem w Claude (żądanie z myśleniem Claude potrzebuje większej odpowiedzi niż 16 tokenów, które ma żądanie keep-alive); nic nie zapisuje do czatu, panel liczy żądania, a gdy nie działa, panel mówi dlaczego). Zacznij od „Long” dla Claude w Anthropic lub OpenRouter: nie wymaga dodatkowych żądań. Claude przez bramę taką jak NanoGPT ignoruje długi czas życia, a modele Gemini tam buforują same przez kilka minut: dla nich użyj Keep alive. W Roleplay przycisk Request size w nagłówku czatu pokazuje, ile z ostatniego żądania pochodziło z pamięci podręcznej i gdzie w prompcie kończy się pamięć podręczna. Keep alive jest dla dostawców bez opcji długiej i nie dla darmowych modeli z dziennym limitem żądań. „Zalecane ustawienia” mogą wypełnić sensowne wartości, a przycisk Przywróć cofa zmiany. Osobne bloki mogą dotyczyć Molfara, odpowiedzi czatu w aplikacjach lub pojedynczej wtyczki. Pola, które zostawiasz wyłączone, nie są wysyłane.

## Model wizyjny

Aplikacje wysyłają do tego modelu obrazy, na przykład po to, by opisać postać z portretu. „Auto” bierze najtańszy model, który umie czytać obrazy. Jeśli żaden z Twoich tego nie potrafi, dodaj połączenie z takim.

## Obrazy

„Obrazy” w Ustawieniach konfiguruje generowanie obrazów dla każdej aplikacji. Możesz dodawać modele obrazów ze swoich połączeń albo serwery obrazów: serwer ComfyUI, AUTOMATIC1111 lub Forge uruchomiony z włączonym API, albo dowolną usługę z endpointem obrazów. ComfyUI może być także na RunPod Serverless: wybierz ComfyUI, wpisz jako adres `https://api.runpod.ai/v2/` i swój identyfikator endpointu, jako klucz swój klucz API RunPod, a w polu „Modele” nazwy plików checkpointów na swoim workerze (RunPod nie potrafi ich wylistować); „Sprawdź” informuje, czy identyfikator endpointu i klucz są poprawne. Pierwszy obraz może potrzebować nawet pół minuty, gdy worker się uruchamia. Oznaczone gwiazdką modele obrazów stają się ulubionymi. Molfar wybiera spośród nich według tego, do czego każdy służy, a Roleplay pokazuje je jako pierwsze w swoim selektorze.

## Mowa

„Mowa” daje syntezę mowy każdej aplikacji. Darmowe głosy Edge działają od razu; każdy ma przycisk „Testuj”. Możesz też „Dodaj endpoint” dla usługi mowy (OpenAI, Groq lub serwer lokalny) z nazwą modelu, domyślnym głosem i kluczem.

## Koszt i małe modele

- Molfar pokazuje szacunek kosztów przed dużymi zadaniami i płatnymi obrazami. Zobacz „Kontrola kosztów” w Ustawieniach, Molfar.
- Model z małym oknem kontekstu może utonąć w pełnych instrukcjach Molfara. „Tryb małego modelu” wysyła krótszy prompt. Jego wartość domyślna, Auto, włącza się przy 32 tys. tokenów lub mniej albo gdy rozmiar jest nieznany.

Zobacz też [[settings]] i [[first-steps]].
