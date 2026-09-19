import { useEffect, useState } from "react";

function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      onClear();
      return;
    }

    const timer = setTimeout(() => {
      onSearch(cleanedQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch, onClear]);

 function handleSubmit(event) {
  event.preventDefault();
}

  function handleClear() {
    setQuery("");
    onClear();
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search episodes..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <button type="submit">
        Search
      </button>

      <button type="button" onClick={handleClear}>
        Clear
      </button>
    </form>
  );
}

export default SearchBar;