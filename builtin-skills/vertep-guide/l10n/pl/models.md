<!-- source: 41cddad16b7f -->
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

Ustawienia modelu obejmują jego okno kontekstu, maks. tokenów wyjściowych, rozumowanie, ceny (w dolarach za milion tokenów), sprawdzenie pamięci podręcznej promptów oraz parametry próbkowania, takie jak kary i Min P. „Zalecane ustawienia” mogą wypełnić sensowne wartości, a przycisk Przywróć cofa zmiany. Osobne bloki mogą dotyczyć Molfara, odpowiedzi czatu w aplikacjach lub pojedynczej wtyczki. Pola, które zostawiasz wyłączone, nie są wysyłane.

## Model wizyjny

Aplikacje wysyłają do tego modelu obrazy, na przykład po to, by opisać postać z portretu. „Auto” bierze najtańszy model, który umie czytać obrazy. Jeśli żaden z Twoich tego nie potrafi, dodaj połączenie z takim.

## Obrazy

„Obrazy” w Ustawieniach konfiguruje generowanie obrazów dla każdej aplikacji. Możesz dodawać modele obrazów ze swoich połączeń albo serwery obrazów: serwer ComfyUI, AUTOMATIC1111 lub Forge uruchomiony z włączonym API, albo dowolną usługę z endpointem obrazów. Oznaczone gwiazdką modele obrazów stają się ulubionymi. Molfar wybiera spośród nich według tego, do czego każdy służy, a Roleplay pokazuje je jako pierwsze w swoim selektorze.

## Mowa

„Mowa” daje syntezę mowy każdej aplikacji. Darmowe głosy Edge działają od razu; każdy ma przycisk „Testuj”. Możesz też „Dodaj endpoint” dla usługi mowy (OpenAI, Groq lub serwer lokalny) z nazwą modelu, domyślnym głosem i kluczem.

## Koszt i małe modele

- Molfar pokazuje szacunek kosztów przed dużymi zadaniami i płatnymi obrazami. Zobacz „Kontrola kosztów” w Ustawieniach, Molfar.
- Model z małym oknem kontekstu może utonąć w pełnych instrukcjach Molfara. „Tryb małego modelu” wysyła krótszy prompt. Jego wartość domyślna, Auto, włącza się przy 32 tys. tokenów lub mniej albo gdy rozmiar jest nieznany.

Zobacz też [[settings]] i [[first-steps]].
