import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                <button type="submit" className="btn-primary" disabled={searching}>
                  <Search size={18} />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div className="search-filters-row">"""

replacement = """                <button type="submit" className="btn-primary" disabled={searching}>
                  <Search size={18} />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-secondary" 
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.2rem', background: showFilters ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--color-text-primary)', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                  <Settings size={18} />
                  Filtros
                  {((filterFormat !== 'Todos' ? 1 : 0) + (filterGenre !== 'Todos' ? 1 : 0)) > 0 && (
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--accent)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--color-bg)' }}>
                      {(filterFormat !== 'Todos' ? 1 : 0) + (filterGenre !== 'Todos' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>

              <div 
                style={{ 
                  maxHeight: showFilters ? '200px' : '0', 
                  opacity: showFilters ? 1 : 0, 
                  overflow: 'hidden', 
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  visibility: showFilters ? 'visible' : 'hidden',
                  marginTop: showFilters ? '1rem' : '0'
                }}
              >
                <div className="search-filters-row" style={{ marginTop: 0 }}>"""
code = code.replace(target, replacement)

target_close = """                    </select>
                  </div>
                </div>
              </form>"""

replacement_close = """                    </select>
                  </div>
                </div>
              </div>
              </form>"""
code = code.replace(target_close, replacement_close)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied")