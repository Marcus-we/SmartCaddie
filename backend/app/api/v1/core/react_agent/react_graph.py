from app.settings import settings

from langchain_core.agents import AgentFinish, AgentAction
from langgraph.graph import END, StateGraph

from app.api.v1.core.react_agent.nodes import reason_node, act_node
from app.api.v1.core.react_agent.react_state import AgentState
from dotenv import load_dotenv

load_dotenv()

REASON_NODE = "reason_node"
ACT_NODE = "act_node"

def should_continue(state: AgentState) -> str:
    if isinstance(state["agent_outcome"], AgentFinish):
        return END
    else:
        return ACT_NODE


graph = StateGraph(AgentState)

graph.add_node(REASON_NODE, reason_node)
graph.set_entry_point(REASON_NODE)
graph.add_node(ACT_NODE, act_node)


graph.add_conditional_edges(
    REASON_NODE,
    should_continue,
)

graph.add_edge(ACT_NODE, REASON_NODE)

app = graph.compile()