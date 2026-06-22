import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = "socialNotifications.filter((notif, index, self) => notif.user?.id !== userData?.id && index === self.findIndex((t) => t.id === notif.id)).map(notif => ("
replacement = "<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>\n                    {socialNotifications.filter((notif, index, self) => notif.user?.id !== userData?.id && index === self.findIndex((t) => t.id === notif.id)).map(notif => ("
code = code.replace(target, replacement)

target2 = """                      </button>
                    </div>
                  ))
                )}"""
replacement2 = """                      </button>
                    </div>
                  ))}
                  </div>
                )}"""
code = code.replace(target2, replacement2)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied!")